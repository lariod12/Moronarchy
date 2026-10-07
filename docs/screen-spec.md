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
- **Modal:** phủ nền xám lên toàn màn (cả TopBar/BottomHud), hộp thoại bo góc ở giữa, nút Yes/No hoặc Done/Close.
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
       └─ Map (đổ xúc xắc)  ◄── TBD: vào Map từ đâu (xem mục 6)      │
                                                                    ▼
                                  Win / Lose ─► Ranking ─► Play Again (Lobby) | Quit (Welcome)
```

Màn bật lên theo luồng game (không vào từ menu): Start Station (Upgrade Card, nâng cấp, tuyển, cửa hàng), các popup trên Map, Fight, End of turn.

## 4. Welcome & Lobby

### 4.1 Welcome — [01](ui/01-welcome.png), [02](ui/02-welcome-creating-room.png)

- Tiêu đề "Welcome Moronarchy" (thiết kế ghi KingDoom, đã đổi tên).
- Khung avatar mặc định, phía trên là tên người chơi hiển thị trực tiếp khi gõ.
- Ô **Name** và ô **Join room** (mã phòng).
  - Ô Join room còn trống: nút chính là **Create**.
  - Ô Join room có giá trị: nút tự đổi thành **Join**.
- Khi đang tạo/vào phòng: phủ xám + "Waiting for creating room".
- Lỗi (sai mã, phòng đầy, đã bắt đầu): TBD về cách hiển thị (đề xuất: tooltip dưới ô Join room).

### 4.2 Lobby — [03](ui/03-lobby-chat.png), [04](ui/04-lobby-typing.png), [05](ui/05-lobby-ready.png), [06](ui/06-lobby-game-starting.png)

- TopBar chỉ có mã phòng.
- Lưới 6 ô Player (2 cột × 3 hàng). Mỗi ô có tên, avatar, bong bóng chat vài giây và nhãn dọc "ready" bên trái khi người đó đã Ready. Ô chưa có người: TBD (đề xuất: ô trống mờ).
- Dưới cùng: khung log chat cuộn được, "Player 1 (you): …" | nút **Chat** | nút **Ready**.
  - Chat: mở ô nhập và bàn phím hệ thống (màn 04), gửi thì hiện bong bóng trên avatar mình và thêm vào log.
  - Ready: bật/tắt. Khi bật, nút tô đậm.
  - Với chủ phòng, nút Ready hiển thị thành **Start**: bị khóa đến khi có ít nhất 2 người và mọi người khác đã Ready.
- Bấm Start: phủ xám + "Game Starting 3 → 2 → 1" trên mọi máy, rồi vào Game Shell (Home hub).
- Chat chỉ có ở Lobby.

## 5. Home hub — [10](ui/10-home-hub.png), [11](ui/11-home-your-turn.png), [12](ui/12-home-end-turn-confirm.png), [13](ui/13-home-end-turn-hint.png)

- TopBar: tên trang "Home".
- Lưới 2 × 3 ô vuông, mỗi ô có tiêu đề và icon: **Stats**, **Plots**, **Dice Status**, **Residents**, **Items**, **Events**.
- [14](ui/14-home-hub-old-with-map.png) là phiên bản cũ có ô **Map** thay cho Stats và "Steps Status" thay cho Dice Status (xem câu hỏi mở).

## 6. Map — [61](ui/61-map.png)

- 40 ô viền quanh màn: hàng trên 31…40, 01 (01 ở góc trên phải); cột phải 02…10; hàng dưới 11 (góc dưới phải) … 21; cột trái 22…30.
- Ô xám: đất của mình. Icon người: vị trí vua của mình.
- Giữa bản đồ: xúc xắc, bong bóng hiện kết quả, nút **Tap to Roll** (thiết kế ghi "Tap to Scroll"). Nút chỉ bật trong lượt mình khi chưa đổ.
- Sau khi đổ: vua đi từng ô (có animation), đi qua Start thì mở Start Station, xong thì đi tiếp.
- Popup trên Map:
  - [62](ui/62-map-waiting-decision.png) "You stand on other players plot, waiting for decision…": A chờ B quyết định, không có nút.
  - ~~[63](ui/63-map-fight-back-prompt.png) "fight back?"~~: **bỏ**. Thay bằng popup cho B khi B đứng trên đất: "Player A stopped on your plot" với **Collect fee** / **Attack** (dùng style của 63).
  - B vắng mặt khi đất bị tấn công: thông báo "Player A is attacking your plot", có nút xem trận.
  - [64](ui/64-map-attack-prompt.png) "You get in other players plot. Do you want to attack on it?" Yes / No: hiện cho A khi B không ở đó.
  - Mua đất trống: popup "Buy this plot? Price X" Buy / Skip. Thiết kế chưa vẽ, Đề xuất theo style popup chung.
  - Dừng trên đất của mình: popup "Your plot" với các lối tắt Upgrade plot / Heal / Recruit / Upgrade residents (mở màn Plot detail ở chế độ quản lý), hoặc Done. Thiết kế chưa vẽ.
  - Nhặt được item / gặp event cá nhân khi dừng trên đất: popup thông báo, nút Done.
  - Trả phí: TBD (đề xuất popup thông báo "You paid X coin to Player B", nút Done).
- **Câu hỏi mở:** Home hub mới không có ô Map, vậy vào Map bằng cách nào? Đề xuất: ô **Dice Status** mở Map (nơi đổ xúc xắc), còn Steps là một tab trong Map.

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
  - Chạm thẻ → "You have picked <Max Health +10>. Are you sure?" Yes / No → "Congratulation! You got Max Health +10" Done.
- Thông báo nhận Start bonus, level up, Income: thiết kế chưa vẽ. Đề xuất một popup tổng kết "Lap complete: +50 coin, Level 2, Income +X".
- Nâng cấp Plot / tuyển Resident / cửa hàng Item: thiết kế chưa vẽ. Đề xuất dùng lại màn Plots/Residents/Items ở chế độ "Start Station", có thanh "Done → continue moving" ở dưới.

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
