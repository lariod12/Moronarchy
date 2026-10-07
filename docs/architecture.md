# Moronarchy — Kiến trúc & kế hoạch refactor

> Trạng thái: **Draft — chờ duyệt**. Mô tả kiến trúc đích và lộ trình chuyển từ code hiện tại sang.
> Đọc kèm [game-design.md](game-design.md) (luật) và [screen-spec.md](screen-spec.md) (màn hình).

## 1. Nguyên tắc

1. **Luật chơi chỉ nằm ở `packages/core`**, viết bằng TypeScript thuần, không phụ thuộc React, DOM hay server.
2. **Server là nguồn sự thật**: mọi move được kiểm tra trên server (boardgame.io); random (xúc xắc, thẻ, item rơi) chạy trên server.
3. **Web chỉ render state và gọi move.** Web không tự quyết kết quả.
4. **Con số cân bằng là dữ liệu, không phải code**: giá, chỉ số, thẻ, item, event nằm trong file content/config của core.
5. **Một nguồn UI duy nhất**: không viết lại luật trong prototype HTML. Xem trước màn hình bằng route gallery trong `apps/web`, dùng state giả tạo từ core.
6. Mỗi luật mới phải có unit test ở core. Mỗi luồng multiplayer mới phải có test ở server hoặc E2E.

## 2. Cấu trúc thư mục đích

```text
apps/
  server/                 boardgame.io server, CORS, lobby security
  web/
    src/
      app/                App (routes)
      match/              MatchProvider/useMatch: kết nối boardgame.io, state lobby/ván
      screens/            welcome/ lobby/ room/ game/: mỗi màn gồm View thuần + container
      shell/              GameShell, TopBar, ActivityLine, BottomHud, CrownButton
      screens/            (thêm dần ở bước 5+) map/ stats/ plots/ residents/ ...
      ui/                 UI kit, mỗi component một thư mục: Tag, SketchBox, Tile, TileGrid,
                          DataTable, Dialog, BlockingOverlay, SpeechBubble, StatTag,
                          IconButton, LongPressButton, Dice, HealthBar, Avatar
      game/               hud-model (engine state → props HUD), sau này boardgame.io client
      dev/gallery/        route /dev/gallery: mọi component/shell với state giả (chỉ dev)
      styles/             tokens.css, base.css, index.css (CSS thuần, không Tailwind)
packages/
  core/
    src/
      content/            dữ liệu cân bằng: kings, plots, residents, cards, items, events
      model/              types: GameState, King, Plot, Resident, Item, Card, Event, PendingDecision
      rules/
        board.ts          di chuyển, ô, đi qua Start
        economy.ts        mua, phí, income
        plots.ts          nâng cấp, máu, tụt level, mất đất
        residents.ts      tuyển, nâng cấp, bonus
        cards.ts          random 3 thẻ, áp dụng
        items.ts          dùng item, hiệu ứng
        events.ts         trigger, thời hạn, hiệu ứng
        combat.ts         (TBD theo phần Fight)
        elimination.ts    phá sản, xếp hạng, thắng
      flow/               state machine của lượt + PendingDecision
      game.ts             boardgame.io Game config (phases, turn order, moves)
      testing/            factory tạo state giả (dùng cho test + gallery)
tests/
  ui/                     Playwright kiểm tra gallery (pnpm ui:check)
  e2e/                    Playwright multiplayer (lobby.spec.ts)
docs/
```

## 3. Mô hình trạng thái

### 3.1 GameState (phác thảo)

```ts
interface GameState {
  seats: Seat[];                  // 6 slot lobby: playerID, name, ready, isHost
  turnOrder: PlayerId[];          // random khi Start
  round: number;
  kings: Record<PlayerId, King>;  // stats, coin, level, position, items, eliminated
  plots: Plot[];                  // owner, level, health, residents
  residents: Record<ResidentId, Resident>;
  events: ActiveEvent[];          // phạm vi, thời hạn
  eventHistory: EventLogEntry[];
  turn: TurnState;                // xem 3.2
  pending: PendingDecision | null;// quyết định đang chờ người chơi nào đó
  ranking: PlayerId[];            // thứ tự bị loại
  log: LogEntry[];                // id lấy theo bộ đếm, không dùng Date.now()
}
```

### 3.2 Flow của lượt

Trạng thái match của boardgame.io là `MatchState { stage: lobby | playing | finished, seats, chat, game }`; `game` là `GameState` của engine (`null` khi ở lobby). Chỉ có **một turn** boardgame.io với `activePlayers: ALL`: mọi người chơi đang kết nối đều được gửi move, và lobby/engine tự kiểm tra actor. Engine tự giữ thứ tự lượt (`G.game.turnOrder`), không bao giờ gọi `events.endTurn`. Mọi move đều `client: false` (server-authoritative, không có random lạc quan ở client). Trong `turn.step` của engine:

```text
stage "lobby"   → sit/leaveSeat, setReady, sendChat, kickSeat, startGame (host)  → stage "playing"
stage "playing" → turn.step:
    awaitClaim → active (dùng item) → rolling → moving
      → startStation (card → nâng cấp/tuyển/mua → done) → moving
      → resolvingTile (mua | phí | quyết định | fight)
      → active → endTurn
stage "finished" → ranking; returnToLobby (host) quay về "lobby" với cùng seats (Play Again)
```

- **PendingDecision** là cách chung để hỏi một người chơi bất kỳ, kể cả người ngoài lượt: chủ đất thu phí hay tấn công, attack or pay, fight back, chọn card. Vì `activePlayers: ALL` nên người đó gọi được move ngoài lượt, engine kiểm tra `pending.playerId`.
- Trạng thái của Crown (rung, đổi màu, end turn) được suy ra từ `turn.step` và `pending`, không lưu riêng ở client.

## 4. Multiplayer & Lobby

- Chat là một lobby move, lưu trong `MatchState.chat` (đã sanitize, giữ 50 tin cuối). **Không** dùng chat built-in của boardgame.io vì nó không được lưu bền và không được sanitize. Nhờ vậy bỏ được:
  - WebSocket chat riêng ở `port+1` (đã xóa `apps/server/src/lobby-chat.ts`).
  - Mẹo `sessionStorage` chọn người đi đầu (`apps/web/src/api/game-start.ts`) và move `chooseStartingPlayer` cắt mảng players.
- Phòng tạo với 6 seat (`validateSetupData` từ chối `numPlayers` khác 6). Seat chưa có người không vào `turnOrder` khi Start (`startGame` chỉ tạo game cho các seat đã ngồi).
- Join bị server từ chối bằng HTTP 409 khi match đã rời lobby (`applyLobbySecurity`). Host có thể kick một seat (`kickSeat`); `returnToLobby` hiện thực Play Again.
- Engine giữ thứ tự lượt (`G.game.turnOrder`), không dùng `turn.order` của boardgame.io.
- Mã phòng = `matchID` do server cấp qua tùy chọn `uuid` (`R` + 4 ký tự dễ đọc, xem `apps/server/src/room-code.ts`). `generateCredentials` được đặt riêng (`randomUUID`) vì boardgame.io mặc định dùng lại `uuid` cho credentials.
- Lỗi do `applyLobbySecurity` ném ra (409/413/429) chạy trước middleware CORS của boardgame.io nên được gắn sẵn header `Access-Control-Allow-Origin` cho origin hợp lệ; nếu không trình duyệt chỉ thấy lỗi mạng chứ không đọc được 409 "Match already started".
- `leaveSeat` được phép ở stage `lobby` và `finished` (Quit ở Ranking), không được phép khi đang `playing`. Seat nhả đi không đụng tới `game`; nếu chủ phòng rời thì `hostId` chuyển cho seat thấp nhất còn lại và người đó mới có thể `returnToLobby`.
- **Test scenarios (chỉ cho e2e):** `setupData: { scenario: "finale" }` khi tạo phòng làm mọi ván của phòng đó bắt đầu từ thế cờ dựng sẵn (`packages/core/src/match/scenarios.ts`: chủ phòng sở hữu mọi Plot ở level 0, vua khác có 5 coin). `validateSetupData` **từ chối mọi `scenario`** (`Test scenarios are disabled.`) trừ khi game được tạo với `allowScenarios: true`; server chỉ bật khi `MORONARCHY_ENABLE_TEST_SCENARIOS=1` (`apps/server/src/game.ts`), biến này chỉ được đặt trong `playwright.config.ts` (webServer của server) và **không bao giờ** được đặt khi chạy thật. `setup` cũng bỏ qua scenario khi chưa bật. Server in cảnh báo khi biến đang bật.
- **Presence và trọng tài người vắng mặt (bước 10).** boardgame.io ghi `metadata.players[id].isConnected` mỗi khi socket nối / ngắt và gọi `db.setMetadata`. `apps/server/src/db-hooks.ts` móc vào `setMetadata` để nuôi `createPresenceTracker` (`presence.ts`: `absentSince(matchID, playerID)`, chỉ tính người đã từng thấy kết nối). `startAbsentReferee` (`absent-referee.ts`, chu kỳ ~2 giây hoặc timeout/4) duyệt các người vắng mặt: ván phải đang `playing`, người đó phải nằm trong `getBlockingPlayerIds(G.game)` (core, thuần: không `Date.now`, không import boardgame.io), và `max(absentSince, lúc ván bắt đầu chờ họ)` đã quá `MORONARCHY_ABSENT_TIMEOUT_MS` (mặc định 30000). Khi đó server **đóng vai người vắng mặt**: `forfeit-client.ts` mở một client boardgame.io ngắn hạn qua `SocketIO` trong Node với đúng `playerID` + credentials lưu trong metadata, gửi move `forfeit` rồi ngắt. Move đi qua đường hợp lệ như mọi move (không sửa state trực tiếp); core `forfeitKing` loại người đó với `eliminationReason = "left"`, kết thúc trận đang diễn ra mà không chuyển phí/coin, xóa quyết định đang chờ, chuyển lượt hoặc kết thúc ván. Trọng tài cũng kiểm tra `transport.clientInfo` (còn socket sống cho người đó thì bỏ qua) vì `isConnected` của boardgame.io là "socket cuối cùng ghi" nên socket cũ ngắt muộn có thể đánh dấu nhầm người đang online. Chỉ ván `playing`; sảnh / sau ván không bao giờ tự loại ai. Move `forfeit` có `ignoreStaleStateID` để không bị bỏ vì ai đó vừa đi trước.
- **Nhả slot boardgame.io.** Hook `db.setState` so seat trước/sau: seat nào biến mất khỏi `G.seats` (host kick, `leaveSeat`/Quit) thì xóa `name`, `credentials`, `isConnected` của slot đó trong metadata (sửa tại chỗ, an toàn với InMemory của boardgame.io; không đụng người còn seat). Nhờ vậy phòng nhận được người mới sau khi đã kick/Quit nhiều lần, và credentials cũ của người bị kick không còn xác thực được. Cần DB mặc định (InMemory); với `FLATFILE_DIR` (async) việc sửa tại chỗ không đảm bảo.
- `createMoronarchyServer` (`create-server.ts`) ghép boardgame.io + `applyLobbySecurity` + hooks + trọng tài; `index.ts` chỉ đọc biến môi trường.
- Phòng vẫn lưu trong RAM ở giai đoạn này.

## 5. Web

- **GameShell** bọc mọi màn trong ván. Màn con là route lồng nhau (`/game/:matchId/home`, `/map`, `/plots/:id`…), nên nút Back dùng được lịch sử router.
- **ModalHost** (`apps/web/src/game/ModalHost.tsx`) hiển thị modal theo `pending` và sự kiện game, tách khỏi màn đang xem: popup hiện đúng dù người chơi đang ở màn nào. Thứ tự ưu tiên nằm ở hàm thuần `selectModal` (`game/modal-model.ts`): quyết định của mình → Lucky Die → "waiting for decision" → End of turn → thông báo từ log → lối tắt "Your plot". Log đã xem được nhớ trong `sessionStorage` theo phòng + lượt chơi + người chơi (`game/seen-store.ts`).
- **MovementContext** (`game/MovementContext.tsx`): từ `turn.path` của engine, mọi máy tự đi từng ô cho token của người đang đi (~220 ms/ô); `isAnimating` giữ popup lại đến khi đi xong, tải lại trang giữa lượt không chạy lại animation.
- **GameSession / GameLayout** (`game/GameSession.tsx`, `game/GameLayout.tsx`): context `{ game, viewerId, actions, canRun }` và khung chung (TopBar, activity line, HUD, ModalHost). Nút Crown, Back và việc ép sang Upgrade Card / Start Station nằm ở đây. `canRun(name, ...args)` dùng `previewCommand` của core để khóa đúng các nút mà engine sẽ từ chối.
- **previewCommand** (`packages/core/src/flow/preview.ts`): chạy thử một command của engine trên bản sao state (rng cố định) và trả đúng kết quả của command thật; dùng chung bước kiểm tra tham số với `match/commands.ts`. Web không tự suy luận luật.
- **UI kit** dựng một lần, các màn chỉ ghép lại. Style là CSS thuần dùng design tokens (`styles/tokens.css`), font Balsamiq Sans, không dùng Tailwind; đổi từ wireframe sang art cuối cùng chỉ cần sửa token.
- **Gallery** (`/dev/gallery`, chỉ bật ở dev) render mọi màn và trạng thái với state từ `core/testing`. Đây là chỗ thay prototype HTML và là chỗ Playwright chụp/kiểm tra.

- **Kết nối ván**: `MatchProvider` (`apps/web/src/match`) tạo một client boardgame.io (`SocketIO`) từ session trong localStorage (`api/lobby.ts`), tự `sit` ở lần sync đầu và cung cấp `useMatch()` = `{ state, playerID, roomCode, players, isConnected, send }`. Mã phòng chính là `matchID`; server cấp mã ngắn qua tùy chọn `uuid` của boardgame.io (`apps/server/src/room-code.ts`).
- **View / container**: mỗi màn tách thành View thuần (chỉ nhận props; dùng cho gallery và unit test) và container mỏng nối `useMatch` với View. Luật lobby không viết lại ở web: dùng `getLobbyView` của core. `RoomScreen` chọn lobby / đếm ngược `Game Starting` / game theo `stage`.
- **Chế độ solo (chơi với bot)** (`apps/web/src/solo`, chỉ ở client): `LocalMatchProvider` cung cấp đúng `MatchContext` của `MatchProvider` nhưng chạy match ngay trong tab. State thô (`MatchState`) nằm trong ref; `send(move, ...args)` chạy move qua chính `createMoronarchyMatchGame` trên bản `structuredClone` với "thân" 0 (người chơi, host) và chỉ commit khi hợp lệ (sai thì bỏ qua như server); view đưa cho màn hình đi qua `maskMatchFor` như online. `solo/browser-rng.ts` là nơi duy nhất ngoài core tạo ngẫu nhiên (`Math.random`). Bot không có luật riêng: `BotDriver` (render trong `GameLayout` qua `GameExtras` để đọc `MovementContext`) chờ độ trễ theo tốc độ (Slow 1200 / Normal 600 / Fast 150 ms) rồi gọi `stepBotAs` của core cho đúng một bot đang bị game chờ (`getRequiredActorIds`), không bao giờ đánh thay người chơi, và dừng khi token còn đang đi hoặc khi bấm Pause. Ván mới / Play Again bắt đầu ở lobby rồi tự `startGame` để `RoomScreen` thấy lobby → playing và hiện đếm ngược. State + cài đặt lưu trong `localStorage` một khóa (`moronarchy:solo`, hỏng thì quay về setup). Các màn dùng lại nguyên; URL trong ván vẫn là `/room/SOLO/<trang>` (mã phòng `SOLO`), setup ở `/solo`, và các route này được lazy-load nên bản online không tải code solo.
- **Bản một file**: `pnpm build:solo` dùng `apps/web/vite.solo.config.ts` (`solo.html` + `src/solo/main-solo.tsx`, `HashRouter`, `vite-plugin-singlefile`, không PWA) để nhét JS/CSS/font vào một file `apps/web/dist-solo/moronarchy-solo.html`, mở được từ `file://`, không gọi mạng.

## 6. Kiểm thử

| Tầng | Công cụ | Nội dung |
| --- | --- | --- |
| core | Vitest | Từng rule, flow lượt, PendingDecision, content hợp lệ |
| server | Vitest | Game config qua boardgame.io test client: move hợp lệ/không hợp lệ, ngoài lượt |
| web | Vitest + Testing Library | Component UI kit, selectors |
| gallery | Playwright (`pnpm ui:check`) | Mỗi entry render không lỗi console, không tràn ngang, long-press và dialog hoạt động |
| e2e | Playwright (`pnpm e2e`) | `endgame.spec.ts`: phòng scenario `finale`, Bob phá sản → Lose / Win → Ranking → Play Again về Lobby → ván mới; Quit nhả seat. `lobby.spec.ts`: 3–4 trình duyệt tạo phòng → join bằng mã → chat → ready → start → Home hub. `game.spec.ts`: 2 người chơi nhận lượt, đổ, đi từng ô, quyết định, qua Start (thẻ + Start Station), kết thúc lượt nhiều vòng |

## 7. Giữ / bỏ / làm lại

| Hiện tại | Quyết định |
| --- | --- |
| Monorepo pnpm, TS, React + Vite, boardgame.io, Vitest, Playwright | **Giữ** |
| `apps/server/src/security.ts` (guard lobby, sanitize tên) | **Giữ**, chỉnh theo seats mới |
| `apps/server/src/lobby-chat.ts` + `apps/web/src/api/lobby-chat.ts`, `game-start.ts` | **Đã bỏ** |
| `packages/core/src/*` (luật kiểu Monopoly MVP) | **Làm lại** theo cấu trúc mục 2; dùng lại `movePosition` và ý tưởng economy |
| `apps/web/src/components/*`, `pages/*`, `styles/index.css` | **Đã bỏ**, thay bằng `shell/`, `ui/`, `styles/tokens.css` |
| `design/*.html`, `tests/design/`, `playwright.design.config.ts`, script `design:*`, `start-design-mobile.bat` | **Đã bỏ**, thay bằng gallery |
| `packages/core/src/legacy/` | **Đã bỏ** (root `@moronarchy/core` = engine) |
| `AGENTS.md` (design completion gate) | **Đã cập nhật** thành UI Completion Gate (gallery + `ui:check`) |
| Docs cũ (`game-rules`, `system-architecture`, `tech-stack`, `development-guide`, `design-task-validation-workflow`) | **Đã thay** bằng bộ docs này |

## 8. Lộ trình

Mỗi bước là một nhánh/PR riêng, chạy được và có test:

1. ✅ **Core engine** (đã xong): model, content, rules (gồm Fight), flow lượt, PendingDecision, selectors, factory test state, bot + mô phỏng (`pnpm --filter @moronarchy/core sim`). Export tại `@moronarchy/core/engine` và `@moronarchy/core/testing`. API cũ (`legacy/`) đã xóa ở bước 3; `@moronarchy/core` giờ trỏ vào engine.
2. ✅ **Server + lobby** (đã xong): `MatchState`/lobby/chat/start/Play Again + game boardgame.io trong `@moronarchy/core/match` (`packages/core/src/match`), `apps/server` chuyển sang đó, bỏ server chat riêng. `apps/web` và `tests/e2e` được phép hỏng lúc chạy cho đến bước 3–5.
3. ✅ **Web nền** (đã xong): router, GameShell (TopBar, BottomHud, Crown long-press), UI kit, tokens, gallery `/dev/gallery`, `pnpm ui:check`; đã xóa `design/`, `legacy/`, Tailwind.
4. ✅ **Màn Welcome + Lobby** (đã xong): Welcome/Lobby/Home hub (placeholder) nối server thật, mã phòng ngắn, kick, chat bong bóng, đếm ngược, e2e nhiều trình duyệt (`pnpm e2e`).
5. **Home hub + Map + đổ xúc xắc + di chuyển + Start Station + mua/phí**: vòng chơi tối thiểu chạy được. ✅ **5A** (đã xong): Crown nhận lượt / kết thúc lượt, Map + đổ xúc xắc + animation di chuyển, mọi popup quyết định, Upgrade Card + Start Station + quản lý đất của mình, activity line, thông báo, màn kết quả tạm; e2e `tests/e2e/game.spec.ts`. **5B** (đã xong): nút Attack bật, màn Fight (`/room/:code/fight`, `getFightView` trong core), popup thông báo/kết quả trận, e2e `tests/e2e/fight.spec.ts`.
6. ✅ **Plots, Residents, Items, Events, Stats, Steps** (đã xong): mọi ô ở Home mở được. Core thêm `getKingInfo`, `getPlotInfo`, `getResidentInfo`, `getResidentsByKind`, `getEventHistoryView`, `getPositionsView` (`flow/info-view.ts`) và mô tả item / event nằm cạnh số liệu trong `content/` (`ITEMS[id].summary|description|use`, `GLOBAL_EVENTS`, `PERSONAL_EVENTS`). Web thêm `screens/{stats,plots,residents,items,events}` và tab Board / Positions ở Map; nút Upgrade/Heal/Use khóa theo `previewCommand` kèm lý do (`createRunCheck`), hộp xác nhận dùng chung với Start Station. Gallery nhóm `Info`; e2e `tests/e2e/info.spec.ts`.
7. ✅ **Kết thúc ván** (đã xong): màn mặt buồn khi bị loại giữa ván → khán giả (HUD "Game Over"), mặt cười / mặt buồn + Ranking khi ván kết thúc (`screens/result/`, `game/end-model.ts`, core `getEliminationInfo`), Play Again chỉ cho chủ phòng về cùng Lobby, Quit nhả seat (`leaveSeat` mở cho stage `finished`), scenario test `finale` (mục 4) cho e2e `tests/e2e/endgame.spec.ts`. Gallery nhóm `End`.
8. ✅ **Màn Fight** (đã xong cùng bước 5B).
9. ✅ Dọn `design/`, cập nhật `AGENTS.md`, README (làm cùng bước 3).
10. ✅ **Độ bền multiplayer** (đã xong): người chơi mất kết nối mà ván chờ họ quá 30 giây thì server cho rời ván (core `forfeitKing`, `getBlockingPlayerIds`, `eliminationReason`; server `presence.ts`, `absent-referee.ts`, `forfeit-client.ts`, `db-hooks.ts`, `create-server.ts`); nhả slot boardgame.io khi kick / Quit; banner `Reconnecting…` / `removed in ~Ns`, đánh dấu offline, `Left in round N`, màn `You were removed`; bàn phím ảo không che ô chat (`interactive-widget=resizes-content`, `100dvh`). Gallery nhóm `Robustness`; e2e `tests/e2e/robustness.spec.ts`; test server có cả test tích hợp với `Server` thật (`robustness.integration.test.ts`).

## 9. Lệnh

```bash
pnpm install
pnpm dev        # build core rồi chạy server + web
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm e2e        # Playwright nhiều trình duyệt: tạo phòng → chat → ready → start
pnpm ui:check   # Playwright kiểm tra gallery
```

Biến môi trường: `PORT` (mặc định 8000), `ALLOWED_ORIGINS`, `VITE_GAME_SERVER_URL`, `MORONARCHY_ABSENT_TIMEOUT_MS` (mặc định 30000; e2e đặt 4000).
