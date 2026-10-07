# Interview Notes — Game Rules & UI Workflow

Nguồn thiết kế gốc: `docs/All UI.png` (+ `docs/Tutorial button.png`).
Biên bản phỏng vấn chủ dự án, ghi theo từng phần. Đây là input để viết lại GDD và screen spec.

## 1. Tổng quan

- Mỗi người chơi dùng 1 điện thoại riêng, chơi online, vào cùng phòng bằng mã (vd `R001`).
- 2–6 người / phòng.
- Thắng: người cuối cùng còn sống (không có giới hạn round).
- Xúc xắc: 1 viên 1–6 (số "11" trong thiết kế chỉ là ví dụ minh họa).

## 2. Welcome & Lobby

- Avatar mặc định (không chọn/không upload), phân biệt bằng tên/màu.
- Chủ phòng bắt đầu game: với chủ phòng, nút Ready hiển thị thành Start, bấm được khi mọi người khác đã Ready → đếm ngược "Game Starting 3-2-1".
- Thứ tự lượt: random khi bắt đầu.
- Chat: bong bóng trên avatar vài giây + khung log; chỉ có ở Lobby, không có trong game.

## 3. Lượt chơi & nút Crown

- Luồng Crown (theo Tutorial): rung khi tới lượt → nhấn giữ nhận lượt → đổi màu ("your turn!") → thao tác → nhấn giữ lần nữa → popup "End of turn… Are you sure?" → người kế. Nhấn 1 lần = về Home. Back = trang trước.
- Trong lượt: bắt buộc đổ xúc xắc 1 lần; được dùng Item; được mua đất khi đứng trên ô trống.
- Ngoài lượt: xem mọi màn nhưng không thao tác; chỉ trả lời popup khi bị hỏi.
- Không giới hạn thời gian lượt.

## 4. Map & xúc xắc

- Map 40 ô. Ô xám = đất của mình; icon người = vị trí hiện tại của mình.
- Loại ô: Start (01), Plot (đất), ô sự kiện/thẻ.
- Ô Start = trạm dừng nâng cấp sau khi đi hết 1 vòng. Hết vòng nhận: + coin, +1 level, chọn 1 trong 3 Upgrade Card random, và được nâng cấp đất.
- Event / Item / Card có thể đến từ ô đất hoặc từ hệ thống (vd sau 3 vòng thì vòng 4 random kích hoạt sự kiện). Logic chi tiết bổ sung sau → thiết kế hệ thống trigger dễ mở rộng.
- Màn Steps / Dice Status: hiển thị vị trí hiện tại.
- Đi qua Start: KHÔNG dừng bắt buộc, vẫn nhận đủ thưởng rồi đi nốt số bước còn lại.

## 5. Plots (đất)

- Đất vừa mua bắt đầu ở level 0.
- Ở Start được nâng cấp nhiều mảnh đất, mỗi lần trả coin (popup "Spend X coin for next level"), giới hạn bởi level vua.
- Người khác dừng trên đất phải trả phí theo level của đất.
- Income: khi vua của chủ đất hoàn thành vòng của chính mình (qua Start), chủ nhận Income của tất cả đất đang sở hữu, tính theo level từng đất.
- Đất có Health / Max Health / Defense / Max Resident.
- Bị tấn công hết máu → tụt 1 level và hồi đầy máu theo level mới. Level 0 mà hết máu → mất đất, đất trở lại trống, ai dừng lên sau cũng mua được.

## 6. Residents

- Tuyển (mua bằng coin) ở Start, đặt vào đất (giới hạn Max Resident của đất).
- 2 loại: Warrior và Farmer. Cả hai đều đánh/thủ khi đất bị tấn công.
  - Warrior: Attack, Defense, Health cao hơn. Khi vua đứng trên đất có Warrior của mình, vua được + Attack/Defense nếu xảy ra giao tranh tại đó.
  - Farmer: chỉ số cơ bản. Tăng Income của đất khi vua về Start thu hoạch.
- Muốn tấn công/chiếm đất phải hạ hết resident trên đất đó trước.

## 7. Fight

- Vua A dừng trên đất của B:
  - Nếu vua B đang đứng tại đất đó → B quyết định: thu phí hoặc tấn công A. A thấy "waiting for decision…".
  - Nếu vua B không ở đó → A quyết định: tấn công (residents → đất) hoặc trả phí.
- Fight back chỉ xảy ra khi vua B đứng tại đất; nếu không, residents tự thủ.
- Vua bị loại: chỉ khi không đủ coin trả phí (phá sản).
- **TODO (phỏng vấn riêng):** cách tính trận đánh (số hiệp, công thức sát thương, xúc xắc), hậu quả khi vua hết Health, phần thưởng khi thắng.

## 8. Items, Upgrade Card, Events

- Items lấy được từ: mua ở Start, rơi từ ô đất/ô sự kiện, phần thưởng Event.
- Có 2 loại item: tiêu hao (dùng 1 lần, số xN giảm) và trang bị (vĩnh viễn).
- Upgrade Card: ở Start random 3 thẻ (Max Health / Attack / Defense / Lucky / Coin) với giá trị random, chọn 1 → cộng vĩnh viễn vào vua (thẻ Coin cộng coin ngay).
- Events: có cả loại toàn bàn và loại cá nhân, có thời hạn (vd "1 Turn"). Màn Events = lịch sử sự kiện + thời hạn còn lại.

## 9. Kết thúc ván

- Người bị loại: hiện màn mặt buồn → thành khán giả xem tiếp (HUD gạch chéo đỏ + "Game Over"), tổng kết ở cuối trận.
- Đất và residents của người bị loại trở về trống.
- Người thắng: màn mặt cười → bảng xếp hạng.
- Bảng xếp hạng có Play Again (cả nhóm về Lobby cùng phòng) và Quit.
- Tên game chính thức: **Moronarchy** (sửa chữ "Welcome KingDoom" trong thiết kế).

## 10. Ô Start — thời điểm thao tác

- Khi đi qua Start: vua tạm dừng tại Start, làm hết thao tác (nhận coin/level/income, chọn Upgrade Card, nâng đất, tuyển resident, mua item), rồi đi nốt số bước còn lại.

## 11. Quyết định về dự án

- Giữ `docs/All UI.png` và `docs/Tutorial button.png` làm thiết kế gốc.
- Bỏ thư mục `design/` (prototype HTML) và quy trình `design:check`; thay bằng route gallery trong `apps/web` dùng state giả từ core.
- Thứ tự làm: viết docs mới (GDD, screen spec, architecture), xóa docs cũ → chủ dự án duyệt → mới refactor code.

## Còn mở (cần phỏng vấn/duyệt tiếp)

- Hệ thống Fight: công thức, số hiệp, hậu quả khi vua hết Health, phần thưởng.
- Toàn bộ con số cân bằng: giá đất, phí theo level, Income, chi phí nâng cấp, Health/Defense đất theo level, Max Resident, chỉ số và giá Warrior/Farmer, coin thưởng qua Start, giới hạn level vua, chỉ số khởi đầu của vua.
- Danh sách item cụ thể và hiệu ứng; danh sách event và điều kiện kích hoạt; ô nào là ô sự kiện.
- Lucky ảnh hưởng gì.

## 12. Fight (phỏng vấn lần 2)

- Màn 92: ✕ = hiệp thua, vương miện = hiệp thắng.
- Mọi trận đều best of 3 (thắng 2 hiệp). Mỗi bên tự bấm Roll trên máy mình.
- Công thức (đã đồng ý): điểm đánh = xúc xắc 1–6 + Attack; ai cao hơn thắng hiệp; sát thương = điểm đánh bên thắng − Defense bên thua, tối thiểu 1; hòa đổ lại.
- Lucky không dùng trong Fight (dùng ngoài Fight).
- Vua hết máu: mất lượt kế tiếp, sau đó hồi máu. Không bị loại.
- Vua đấu vua (B có mặt và chọn tấn công): B thắng thì A trả phí; A thắng thì A miễn phí.
- A tấn công và thua: dừng lại và vẫn trả phí. Rút lui giữa trận được, nhưng tính như thua (trả phí).
- Bỏ popup "fight back?" (màn 63). Khi B có mặt, B nhận popup quyết định Thu phí / Tấn công.
- Residents trên một đất gộp thành một đội: máu đội = tổng máu; Attack/Defense = cao nhất trong đội, +1 cho mỗi resident thêm (đồng ý đề xuất). Sát thương chia đều; máu đội càng thấp thì càng nhiều resident chết; máu đội về 0 thì chết hết. Mục đích: tạo cảm giác thiệt hại, đánh nhanh, không phải đánh từng resident.
- Thắng đội resident: vượt qua và cướp coin theo level đất, rồi dừng (không đánh tiếp vào đất trong lượt đó).
- Đánh đất (khi không còn resident): cũng best of 3. Đất thụ động, chỉ bên tấn công gây sát thương; công thức do mình đề xuất. Chỉ chiếm được khi đất hết máu; thắng 2 hiệp mà đất chưa hết máu thì không chiếm được.
- Đất mất (level 0, hết máu): người phá được mua ngay trong lượt đó.
- Được dùng item trước mỗi hiệp.
- Hồi máu: vua hồi đầy miễn phí ở Start. Resident và đất: ở Start, trong vòng nâng cấp, trả coin để hồi; chi phí tăng theo level.
- Duyệt đề xuất: công thức số resident còn sống, cách đất thắng hiệp, thắng đất mà chưa phá được thì miễn phí, vua về 0 máu thì hồi 50%. Resident chết trước: level thấp nhất, cùng level thì chỉ số yếu nhất.

## 13. Câu hỏi thiết kế còn lại

- Không có ô sự kiện riêng: mọi ô trừ Start đều là đất. Item/event cá nhân rơi ngẫu nhiên khi dừng trên đất; event toàn bàn do hệ thống kích hoạt.
- Dừng trên đất của mình: quản lý tại chỗ cho mảnh đất đó (nâng cấp, hồi máu, tuyển, nâng cấp resident).
- Level tối đa: vua 5, đất 5.
- Lucky (ngoài Fight): tăng tỉ lệ rơi item, chất lượng Upgrade Card, độ may của event cá nhân.
- Nâng cấp resident: ở Start và khi dừng trên đất của mình; trả coin; level resident không vượt level đất.
- Chi tiêu tự do: chỉ kiểm tra đủ coin, được tiêu về 0; ít coin thì dễ phá sản là rủi ro của người chơi.
