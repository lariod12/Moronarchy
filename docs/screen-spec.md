# Moronarchy — Screen Spec

> Trạng thái: **Draft — chờ duyệt**.
> Thiết kế gốc: [All UI.png](All%20UI.png) và [Tutorial button.png](Tutorial%20button.png). Mỗi màn có ảnh cắt riêng trong [ui/](ui/).
> Luật chơi tham chiếu [game-design.md](game-design.md). File này chỉ mô tả màn hình, điều hướng và trạng thái hiển thị.

## 1. Bố cục chung (Game Shell)

Mọi màn trong ván (trừ Welcome, Lobby, Win/Lose, Ranking) dùng chung khung đứng cho điện thoại:

```text
┌────────────────────────────────────────┐
│ [Round N]      [R001]      [Tên trang] │  ← TopBar
│                                        │
│              Nội dung màn              │
│                                        │
├──────────┬──────────┬────────┬─────────┤
│ Player   │ health   │  (←)   │  Crown  │  ← BottomHud
│ Name     │ coin     │  Back  │         │
│ (avatar) │ level    │        │         │
└──────────┴──────────┴────────┴─────────┘
```

- **TopBar:** số round hiện tại (từ round 20 kèm hệ số lạm phát phí, vd "Round 22 · Fee ×1.25"), mã phòng, tên trang đang mở (Home, Map, Plots, Residents, Warrior, Farmer, Items, Events, Steps, Players Info, Upgrade Card, Fight…).
- **BottomHud:**
  - Avatar và tên: chạm vào để mở Players Info (màn 20).
  - health / coin / level của vua mình.
  - **Back:** về trang trước trong ván.
  - **Crown:** điều khiển lượt (mục 2).
- **Activity line (bước 5A):** một dòng chữ ngay dưới TopBar, hiện sự kiện mới nhất trong log bằng tiếng Anh, nhìn từ phía người xem ("You rolled 4 → Plot 15", "Bob bought Plot 7", "Cara paid 40 coin to Bob", "Bob completed a lap"). Có ở mọi trang trong ván.
- **Modal:** phủ nền xám lên toàn màn (cả TopBar/BottomHud), hộp thoại bo góc ở giữa, nút Yes/No hoặc Done/Close. Chỉ hiện một modal một lúc, ở bất kỳ trang nào người chơi đang xem (`ModalHost`): quyết định dành cho mình → chọn Lucky Die → "waiting for decision" → End of turn → thông báo (item, event cá nhân, nhận phí, bị hạ gục, mất đất, bị loại) → lối tắt "Your plot". Mọi modal chờ đến khi vua đi xong.
- **Tooltip / bong bóng:** bong bóng nói nhỏ trỏ vào phần tử (vd "your turn!", "end turn!", số xúc xắc).

## 2. Nút Crown (theo Tutorial button.png)

| Trạng thái | Hiển thị | Thao tác |
| --- | --- | --- |
| Không phải lượt mình | Crown trắng | Chạm: về Home |
| Tới lượt, chưa nhận | Crown **rung** | Nhấn giữ: nhận lượt |
| Đang trong lượt | Crown **đổi màu** (nền tối, crown trắng) + bong bóng "your turn!" | Chạm: về Home. Nhấn giữ: mở popup End of turn |
| Đã đổ xúc xắc, có thể kết thúc | Bong bóng "end turn!" | Nhấn giữ → popup "End of turn" → Yes |
| Bị loại | HUD gạch chéo đỏ, "Game Over" thay cho Back/Crown | Không có |

- Nhấn giữ (long-press) cần có phản hồi tiến trình (vòng nạp hoặc rung) để người chơi biết đang giữ. Thời gian giữ: Đề xuất 600 ms.
- Popup End of turn: "This action will be end turn and you cannot interactive some action. Are you sure?" với Yes / No.

## 3. Sơ đồ điều hướng

```text
Welcome ──Create/Join──► Lobby ──Start (chủ phòng) + đếm ngược──► Game Shell
                                                                    │
     Home hub ◄─────────── chạm Crown (từ bất kỳ đâu) ──────────────┤
       ├─ Stats ─► Players Info                                     │
       ├─ Plots ─► Plots table / grid ─► Plot detail ─► Upgrade      │
       ├─ Dice Status ─► Steps (vị trí mọi vua)                      │
       ├─ Residents ─► Warrior / Farmer table|grid ─► Resident detail│
       ├─ Items ─► Item detail ─► Description                        │
       ├─ Events ─► History events                                   │
       └─ Dice Status ─► Map (đổ xúc xắc; nhận lượt cũng tự mở Map)  │
                                                                    ▼
                                  Win / Lose ─► Ranking ─► Play Again (Lobby) | Quit (Welcome)
```

Màn bật lên theo luồng game (không vào từ menu): Start Station (Upgrade Card, nâng cấp, tuyển, cửa hàng), các popup trên Map, Fight, End of turn.

Bước 5A: route trong phòng là `/room/<MÃ>/home` (mặc định), `/map`, `/cards`, `/station`, `/manage/<plotId>`. Ô **Dice Status** mở Map (các ô khác ở Home còn khóa đến bước 6). Nhấn giữ Crown đang rung nhận lượt và tự mở Map. Nút Back = về trang trước, khóa ở Home và khi bị buộc ở Upgrade Card / Start Station. Khi qua Start, người chơi bị đưa tới Upgrade Card rồi Start Station và chỉ rời khi bấm "Continue moving".

## 4. Welcome & Lobby

### 4.1 Welcome — [01](ui/01-welcome.png), [02](ui/02-welcome-creating-room.png)

- Tiêu đề "Welcome Moronarchy" (thiết kế ghi KingDoom, đã đổi tên).
- Khung avatar mặc định, phía trên là tên người chơi hiển thị trực tiếp khi gõ.
- Ô **Name** và ô **Join room** (mã phòng).
  - Ô Join room còn trống: nút chính là **Create**.
  - Ô Join room có giá trị: nút tự đổi thành **Join**.
- Khi đang tạo/vào phòng: phủ xám + "Waiting for creating room".
- Lỗi hiển thị dạng chữ đỏ ngay dưới ô Join room: `Room not found` (sai mã), `Room is full`, `Game already started`, `Cannot reach the server`. Gõ lại mã thì lỗi biến mất.
- Mã phòng ngắn, dạng `R` + 4 ký tự từ `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (bỏ I, O, 0, 1 cho dễ đọc); khi nhập không phân biệt hoa thường. Khi tạo/vào xong, URL là `/room/<MÃ>`.
- Link chia sẻ `/?room=<MÃ>` mở Welcome với ô Join room điền sẵn. Mở `/room/<MÃ>` mà máy chưa có chỗ ngồi (không có session trong localStorage) cũng chuyển về `/?room=<MÃ>`. Có session thì tải lại trang vẫn giữ chỗ.

### 4.2 Lobby — [03](ui/03-lobby-chat.png), [04](ui/04-lobby-typing.png), [05](ui/05-lobby-ready.png), [06](ui/06-lobby-game-starting.png)

- TopBar chỉ có mã phòng. Chạm vào mã để copy, hiện bong bóng `copied!` 1,5 giây.
- Lưới 6 ô Player (2 cột × 3 hàng). Mỗi ô có tên, avatar, bong bóng chat vài giây và nhãn dọc "ready" bên trái khi người đó đã Ready. Ô chưa có người: ô viền nét đứt, mờ, ghi `Empty`. Chỗ ngồi cố định theo playerID nên người rời đi để lại ô trống thay vì dồn chỗ. Chủ phòng có tag nhỏ `host`; người mất kết nối bị làm mờ. Chủ phòng chạm vào ô của người khác thì hiện hộp thoại `Kick <tên>?` No / Yes; người bị kick quay về Welcome.
- Dưới cùng: khung log chat cuộn được, "Player 1 (you): …" | nút **Chat** | nút **Ready**.
  - Chat: mở một hàng nhập (`Say something…` + `Send`, tối đa 120 ký tự, Enter gửi, Esc đóng) và bàn phím hệ thống (màn 04). Gửi xong hàng nhập vẫn mở và được xóa. Tin hiện bong bóng 3 giây trên ô của người gửi ở mọi máy và thêm vào log (`Tên (you): …` cho tin của mình, `Tên: …` cho người khác). Tin cũ có sẵn khi vào phòng không tạo bong bóng.
  - Ready: bật/tắt. Khi bật, nút tô đậm.
  - Với chủ phòng, nút Ready hiển thị thành **Start**: bị khóa đến khi có ít nhất 2 người và mọi người khác đã Ready.
- Bấm Start: phủ xám + "Game Starting 3 → 2 → 1" trên mọi máy đang ở lobby, rồi vào Game Shell (Home hub). Máy tải lại hoặc vào phòng khi ván đã chạy thì vào thẳng Game Shell, không đếm ngược.
- Chat chỉ có ở Lobby.

## 5. Home hub — [10](ui/10-home-hub.png), [11](ui/11-home-your-turn.png), [12](ui/12-home-end-turn-confirm.png), [13](ui/13-home-end-turn-hint.png)

- TopBar: tên trang "Home".
- Lưới 2 × 3 ô vuông, mỗi ô có tiêu đề và icon: **Stats**, **Plots**, **Dice Status**, **Residents**, **Items**, **Events**.
- [14](ui/14-home-hub-old-with-map.png) là phiên bản cũ có ô **Map** thay cho Stats và "Steps Status" thay cho Dice Status (xem câu hỏi mở).

## 6. Map — [61](ui/61-map.png)

- 40 ô viền quanh màn: hàng trên 31…40, 01 (01 ở góc trên phải); cột phải 02…10; hàng dưới 11 (góc dưới phải) … 21; cột trái 22…30.
- Ô xám đậm: đất của mình. Đất của người khác có nền xám nhạt và huy hiệu **số ghế** của chủ đất (ghế 1 = playerID 0). Ô 01 (Start) viền đôi.
- Mọi vua còn sống là một token tròn có chữ cái đầu của tên (token của mình đảo màu), nằm trên ô vua đang đứng; nhiều vua trên một ô thì xếp chồng lệch nhau.
- Giữa bản đồ: xúc xắc, bong bóng hiện kết quả (số xúc xắc + bonus), nút **Tap to Roll** (thiết kế ghi "Tap to Scroll"). Nút chỉ bật trong lượt mình khi đã nhận lượt và chưa đổ. Trước khi đổ, nếu có Horse thì có thêm nút **Use Horse (+3)**. Dòng chữ nhỏ bên dưới cho biết đang là lượt ai / cần làm gì.
- Sau khi đổ: xúc xắc hiện số, vua của người đang đi di chuyển từng ô theo `turn.path` (khoảng 220 ms mỗi ô, tắt animation khi người dùng chọn giảm chuyển động) trên **mọi máy**; popup chỉ hiện sau khi vua đi xong. Tải lại trang giữa lượt không chạy lại animation. Đi qua Start thì mở Upgrade Card rồi Start Station, xong thì đi tiếp.
- Có Lucky Die: sau khi đổ hiện popup "You rolled N" với **Reroll (Lucky Die)** / **Move**.
- Nút **Attack** trong mọi popup quyết định đang bị khóa kèm gợi ý "Fights arrive in the next update" cho đến bước 5B (màn Fight); khi có Peace Treaty gợi ý là "Peace Treaty: no attacks".
- Popup trên Map:
  - [62](ui/62-map-waiting-decision.png) "You stand on <Tên>'s plot, waiting for decision…": A chờ B quyết định, không có nút và không đóng được.
  - ~~[63](ui/63-map-fight-back-prompt.png) "fight back?"~~: **bỏ**. Thay bằng popup cho B khi B đứng trên đất: "Player A stopped on your plot" với **Collect fee** / **Attack** (dùng style của 63).
  - B vắng mặt khi đất bị tấn công: thông báo "Player A is attacking your plot", có nút xem trận.
  - [64](ui/64-map-attack-prompt.png) "You get in other players plot. Do you want to attack on it?" Yes / No: hiện cho A khi B không ở đó.
  - Mua đất trống (đã làm ở 5A): tiêu đề "Plot 12", nội dung "Buy this plot for 80 coin?" với **Skip** / **Buy** (Buy khóa khi không đủ coin). Đất vừa bị phá: "You broke Plot 12. Buy it now for 80 coin?".
  - Đứng trên đất người khác (B vắng): "You get in Bob's plot (Plot 12). Pay 40 coin or attack?" với **Pay 40** / **Attack**. Khi B có mặt, B nhận "Alice stopped on your Plot 12. Collect 40 coin or attack?" với **Collect** / **Attack**.
  - Dừng trên đất của mình (hoặc vừa mua xong): popup "Your plot (Plot 12)" với **Manage** (mở `/manage/12`, màn kiểu Start Station chỉ có đất đó, không có Shop) hoặc **Done**.
  - Nhặt được item / gặp event cá nhân / nhận phí / bị hạ gục / mất đất / bị loại: popup thông báo, nút Done. Popup của một lần đã xem được nhớ trong `sessionStorage` nên tải lại trang không hiện lại.
  - Trả phí: người trả chỉ thấy dòng trong activity line; chủ đất nhận popup "Fee received".
- Vào Map: ô **Dice Status** ở Home mở Map, và nhận lượt cũng mở Map. Steps (mục 13) sẽ là một tab trong Map ở bước 6.

## 7. Stats / Players Info — [20](ui/20-player-stats.png)

- TopBar "Players Info".
- Khung lớn: tên, avatar, danh sách chỉ số: Level, Coin, Health, Max Health, Attack, Defense, Lucky.
- Mở từ ô Stats ở Home hoặc chạm avatar ở BottomHud ("tap me to go info").
- Xem chỉ số của người chơi khác: TBD (đề xuất: vuốt hoặc mũi tên chuyển người).

## 8. Plots — [40](ui/40-plots-table.png), [41](ui/41-plots-grid.png), [42](ui/42-plot-detail.png), [43](ui/43-plot-upgrade-confirm.png)

- **Bảng** (40): cột Plots | Level | Income | Price, dòng xen màu, cuộn được, nút "details" trên dòng đang chọn, nút **View All** chuyển sang dạng lưới.
- **Lưới** (41): thẻ Plot (tên "Plot N", icon lâu đài-nhà, nhãn "Level: X").
- **Chi tiết** (42): tên Plot, icon lớn, nhãn Level, Price, Income, Health, Max Health, Defense, Max Resident; nút **Upgrade**.
- **Xác nhận nâng cấp** (43): "Upgrade — Spend X coin for next level" No / Yes.
- Nút Upgrade chỉ bật khi đang ở Start Station, đủ coin và level vua cho phép. Ngoài lúc đó: ẩn hoặc khóa (TBD).
- Phạm vi bảng: chỉ đất của mình, hay mọi ô kèm chủ: TBD (đề xuất: đất của mình, có bộ lọc "tất cả").

## 9. Residents — [50](ui/50-residents-overview.png) → [56](ui/56-resident-upgrade-confirm.png)

- **Tổng quan** (50): hai thẻ lớn Warrior (icon đen, ×20) và Farmer (icon viền, ×12) kèm số lượng.
- **Bảng theo loại** (51 Farmer, 52 Warrior): Name | Level | Plots | Plots LV, cuộn, "details", View All.
- **Lưới theo loại** (53 Warrior, 54 Farmer): thẻ có loại, icon, "Plot N", "Name: 01".
- **Chi tiết** (55): Name, Level, Attack, Defense, Plot; icon lớn kèm bong bóng; nút **Upgrade**.
- **Xác nhận nâng cấp** (56): "Spend X coin for next level" No / Yes.
- Tuyển resident và đặt lên Plot diễn ra trong Start Station. Màn này thiết kế chưa vẽ (mục 12).

## 10. Items — [30](ui/30-items-grid.png), [31](ui/31-item-detail.png), [32](ui/32-item-description.png)

- **Lưới** (30): thẻ item gồm tên, icon, số lượng "xN". Chạm giữ hiện tooltip.
- **Chi tiết** (31): tên, icon lớn, "xN", mô tả ngắn, nút **View Details**.
- **Mô tả** (32): popup "Description" có mô tả đầy đủ và nút Close.
- Nút **Use** cho item dùng được: thiết kế chưa có. Đề xuất đặt ở màn chi tiết, chỉ bật trong lượt mình.

## 11. Events — [70](ui/70-events.png)

- Tab "History Events", danh sách cuộn. Mỗi thẻ có tên sự kiện, mô tả trong ngoặc kép và nhãn thời hạn ("1 Turn").
- Phân biệt event toàn bàn và cá nhân: TBD về hiển thị (đề xuất: nhãn "All" / "You").

## 12. Start Station (bật lên khi đi qua ô 01)

- **Upgrade Card** — [80](ui/80-upgrade-card-pick.png), [81](ui/81-upgrade-card-confirm.png), [82](ui/82-upgrade-card-congrats.png)
  - 3 thẻ random. Mỗi thẻ có tên chỉ số, icon và giá trị "+N".
  - Chạm thẻ → "You have picked <Max Health +10>. Are you sure?" Yes / No → "Congratulation! You got Max Health +10" Done. (Bản dựng bỏ cặp dấu `<>` của bản thiết kế: "You have picked" / "Max Health +10. Are you sure?".) Xong thì sang Start Station.
- **Start Station** (bước 5A, `/room/<MÃ>/station`, TopBar "Start Station"): thanh tóm tắt "Lap complete: +100 coin · Level N · Income +X" lấy từ log `lapCompleted`; ba tab **Plots** / **Residents** / **Shop**; hàng nào cũng có nút kèm giá lấy từ engine: Plots (`Upgrade 45`, `Heal 12`), Residents (`Upgrade 40`, `Heal 8`, `Recruit Warrior 70`, `Recruit Farmer 40` cho từng đất còn chỗ), Shop (`Buy 40`...). Nút khóa đúng lúc engine sẽ từ chối (`previewCommand`). Nâng cấp / tuyển / mua hỏi "Spend X coin …?" No / Yes; hồi máu làm ngay. Thanh dưới cùng là **Continue moving** (còn bước chưa đi) hoặc **Done**.
- **Manage** (`/room/<MÃ>/manage/<plotId>`): cùng màn nhưng giới hạn trong đất vừa dừng/mua, chỉ có tab Plots và Residents, nút dưới cùng là **Done**.

## 13. Steps / Dice Status — [60](ui/60-steps.png)

- Bảng 2 cột (thiết kế: Turn | Position). Theo phỏng vấn, màn này hiển thị **vị trí hiện tại** của mọi vua.
- Đề xuất: cột "Player | Position", sắp xếp theo thứ tự lượt.

## 14. Fight — [90](ui/90-fight.png), [91](ui/91-fight-empty.png), [92](ui/92-fight-status.png)

Luật: [game-design.md mục 10](game-design.md#10-fight).

- TopBar "Fight". Hai khung đấu, bên trái là mình, bên phải là đối thủ. Mỗi khung có:
  - thanh máu "hiện tại/tối đa" ở trên (vd 50/100);
  - tên ("You", "Player 2", "Residents ×5", "Plot 12");
  - hình đại diện: avatar vua, icon đội resident kèm số còn sống, hoặc icon Plot kèm level.
- Kiếm chéo ở giữa hai khung.
- Hàng icon dưới thanh máu (màn 92): **vương miện = hiệp thắng, ✕ = hiệp thua**. Thắng 2 hiệp là thắng trận.
- Xúc xắc và nút **Roll** (thiết kế ghi "Scroll") ở dưới. Mỗi người tự bấm Roll trên máy mình. Bên hệ thống (residents, Plot) tự đổ.
- Sau mỗi hiệp hiện điểm đánh hai bên và số máu mất (bong bóng số trên khung bị đánh).
- Trước mỗi hiệp: nút **Use item** (mở kho đồ dạng popup). Người tấn công có thêm nút **Retreat**, kèm xác nhận "Retreat counts as a loss — you will pay X coin".
- Màn 91 (khung trống): trạng thái chờ khi đang nạp đối thủ hoặc chờ bên kia Roll (Đề xuất).
- Kết thúc trận: popup kết quả (thắng/thua, coin cướp được hoặc phí phải trả, resident chết, Plot tụt level). Nếu Plot bị phá mất: popup "Buy this plot now? Price X".
- Người không tham gia trận vẫn xem được (chế độ khán giả, không có nút).

## 15. Kết thúc — [95](ui/95-map-before-game-over.png), [96](ui/96-game-over-spectator.png), [97](ui/97-result-win.png), [98](ui/98-result-lose.png), [99](ui/99-result-ranking.png)

- Bị loại: màn mặt buồn (98) → về Game Shell ở chế độ khán giả (96). BottomHud: avatar gạch chéo đỏ, các chỉ số xám, chữ "Game Over" thay Back/Crown.
- Người thắng: màn mặt cười (97).
- Ranking (99): danh sách "Player 1…N" theo thứ hạng, nút **Play Again** và **Quit**.
- **Tạm thời (đến bước 7):** khi ván kết thúc mọi máy thấy màn placeholder "Game over" + "Winner: <tên>" + danh sách xếp hạng (người thắng, rồi những người bị loại theo thứ tự ngược). Chủ phòng có **Back to lobby** (`returnToLobby`), ai cũng có **Quit** (xóa session, về Welcome). Người bị loại khi ván còn tiếp tục thấy HUD "Game Over" và xem Map như khán giả, không có thao tác nào.

## 16. Phong cách hình ảnh

- Thiết kế là wireframe đen trắng nét vẽ tay. Phong cách cuối cùng (giữ sketch hay vẽ art hoàn chỉnh): TBD.
- Hiện tại build theo bố cục và thứ bậc thông tin của wireframe, dùng design tokens (màu, viền, font) để đổi style sau mà không sửa component.

## 17. Câu hỏi mở về UI

1. Vào Map từ đâu khi Home hub mới không còn ô Map?
2. Hiển thị đất và vị trí của người chơi khác trên Map (màu theo người chơi?).
3. Các màn Start Station chưa có thiết kế: tổng kết vòng, nâng cấp, tuyển resident, cửa hàng.
4. Popup mua đất, trả phí, nút Use item; popup kết quả Fight; màn Start Station hồi máu Plot/Resident.
5. Xem chỉ số người chơi khác.
6. Phong cách hình ảnh cuối cùng.
