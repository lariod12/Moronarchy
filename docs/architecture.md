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
      app/                App (routes), HomePlaceholder
      shell/              GameShell, TopBar, BottomHud, CrownButton (ModalHost sau)
      screens/            (từ bước 4) welcome/ lobby/ home/ map/ stats/ plots/ residents/ ...
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
  e2e/                    Playwright multiplayer (viết lại ở bước 4)
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
- Phòng vẫn lưu trong RAM ở giai đoạn này.

## 5. Web

- **GameShell** bọc mọi màn trong ván. Màn con là route lồng nhau (`/game/:matchId/home`, `/map`, `/plots/:id`…), nên nút Back dùng được lịch sử router.
- **ModalHost** hiển thị modal theo `pending` và sự kiện game, tách khỏi màn đang xem: popup hiện đúng dù người chơi đang ở màn nào.
- **UI kit** dựng một lần, các màn chỉ ghép lại. Style là CSS thuần dùng design tokens (`styles/tokens.css`), font Balsamiq Sans, không dùng Tailwind; đổi từ wireframe sang art cuối cùng chỉ cần sửa token.
- **Gallery** (`/dev/gallery`, chỉ bật ở dev) render mọi màn và trạng thái với state từ `core/testing`. Đây là chỗ thay prototype HTML và là chỗ Playwright chụp/kiểm tra.

## 6. Kiểm thử

| Tầng | Công cụ | Nội dung |
| --- | --- | --- |
| core | Vitest | Từng rule, flow lượt, PendingDecision, content hợp lệ |
| server | Vitest | Game config qua boardgame.io test client: move hợp lệ/không hợp lệ, ngoài lượt |
| web | Vitest + Testing Library | Component UI kit, selectors |
| gallery | Playwright (`pnpm ui:check`) | Mỗi entry render không lỗi console, không tràn ngang, long-press và dialog hoạt động |
| e2e | Playwright | 2–3 trình duyệt: tạo phòng → ready → start → một vòng lượt |

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
4. **Màn Welcome + Lobby** theo screen spec.
5. **Home hub + Map + đổ xúc xắc + di chuyển + Start Station + mua/phí**: vòng chơi tối thiểu chạy được.
6. **Plots, Residents, Items, Events, Stats, Steps.**
7. **Kết thúc ván**: khán giả, Win/Lose, Ranking, Play Again.
8. **Màn Fight** (luật đã có trong engine).
9. ✅ Dọn `design/`, cập nhật `AGENTS.md`, README (làm cùng bước 3).
10. **E2E multiplayer mới** (`tests/e2e`) và xử lý người chơi mất kết nối giữa ván.

## 9. Lệnh

```bash
pnpm install
pnpm dev        # build core rồi chạy server + web
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm e2e        # chưa có test cho tới bước 4
pnpm ui:check   # Playwright kiểm tra gallery
```

Biến môi trường: `PORT` (mặc định 8000), `ALLOWED_ORIGINS`, `VITE_GAME_SERVER_URL`.
