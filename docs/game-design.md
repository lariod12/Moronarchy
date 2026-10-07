# Moronarchy — Game Design Document

> Trạng thái: **Draft — chờ duyệt**.
> Nguồn: phỏng vấn chủ dự án ([interview-notes.md](interview-notes.md)) + thiết kế gốc [All UI.png](All%20UI.png), [Tutorial button.png](Tutorial%20button.png).
> Mục nào ghi **TBD** là chưa có quyết định. Mục nào ghi **Đề xuất** là giá trị mình đưa ra để có cái mà chơi thử, cần chủ dự án duyệt.

## 1. Tổng quan

Moronarchy là board game multiplayer online cho điện thoại. 2–6 vị vua đổ xúc xắc đi vòng quanh bản đồ 40 ô. Trên đường đi, họ mua đất, tuyển cư dân, nâng cấp vương quốc, đánh chiếm đất của nhau và cố không bị phá sản. **Người cuối cùng còn trụ lại là người thắng.**

- Mỗi người chơi dùng một điện thoại riêng và vào cùng phòng bằng mã phòng (vd `R001`).
- Không có giới hạn số round, không có giới hạn thời gian lượt.

## 2. Thuật ngữ

| Thuật ngữ | Nghĩa |
| --- | --- |
| King (vua) | Nhân vật của mỗi người chơi |
| Plot (đất) | Ô đất trên bản đồ, mua được, có chủ, có level |
| Resident | Cư dân đặt trên Plot: Warrior hoặc Farmer |
| Item | Vật phẩm trong kho của vua (tiêu hao hoặc trang bị) |
| Upgrade Card | Thẻ tăng chỉ số vĩnh viễn, được chọn ở ô Start |
| Event | Sự kiện toàn bàn hoặc cá nhân, có thời hạn |
| Turn (lượt) | Lượt của một người chơi |
| Round | Tất cả người còn sống đều đã đi xong một lượt (hiển thị "Round N" trên thanh trên cùng) |
| Lap (vòng) | Vua của một người đi hết 40 ô và quay lại ô Start |

## 3. Thiết lập ván

- Số người: 2–6.
- Thứ tự lượt: random một lần khi ván bắt đầu.
- Mọi vua bắt đầu ở ô 01 (Start).
- Chỉ số khởi đầu của vua:

| Chỉ số | Giá trị | Ghi chú |
| --- | ---: | --- |
| Level | 1 | |
| Coin | 200 | Đề xuất (lấy theo code hiện tại) |
| Health / Max Health | 100 / 100 | Đề xuất |
| Attack | 5 | Đề xuất (theo màn Players Info) |
| Defense | 3 | Đề xuất (theo màn Players Info) |
| Lucky | 0 | Tăng tỉ lệ rơi item, chất lượng Upgrade Card, độ may của event cá nhân |

## 4. Cấu trúc một lượt

```text
Chờ lượt ──► Crown rung (tới lượt mình)
           ──► Nhấn giữ Crown = nhận lượt → Crown đổi màu, bong bóng "your turn!"
           ──► [Tự do] Dùng Item (bao nhiêu lần cũng được, trong giới hạn item)
           ──► Đổ xúc xắc (bắt buộc, đúng 1 lần, ở màn Map: nút "Tap to Roll")
           ──► Di chuyển từng ô
                 └─ nếu đi qua/đến ô 01 → dừng tạm ở Start Station (mục 6) → đi nốt số bước còn lại
           ──► Giải quyết ô đích (mục 7–9)
           ──► [Tự do] Dùng Item
           ──► Nhấn giữ Crown → popup "End of turn… Are you sure?" → Yes → chuyển người kế
```

- Chưa đổ xúc xắc thì không kết thúc lượt được.
- **Ngoài lượt mình:** xem được mọi màn nhưng mọi nút hành động bị khóa. Chỉ được trả lời popup hỏi mình (vd chủ đất quyết định thu phí hay tấn công).
- Nhấn một lần vào Crown = về Home hub. Nút Back = về trang trước.

## 5. Bản đồ

- 40 ô xếp thành vòng vuông, đi theo chiều tăng dần 01 → 40 → 01.
- Các loại ô:
  - **Start (01):** trạm nâng cấp (mục 6).
  - **Plot (02–40):** mọi ô còn lại đều là đất mua được. **Không có ô sự kiện riêng.**
- Khi dừng trên một Plot có thể ngẫu nhiên rơi Item hoặc kích hoạt event cá nhân (tỉ lệ phụ thuộc Lucky). Event toàn bàn do hệ thống kích hoạt (mục 13).
- Hiển thị trên Map: ô xám là đất của mình, icon người là vị trí vua của mình. Cách hiển thị đất và vị trí của người khác: **TBD** (xem screen spec).
- Màn Steps / Dice Status: vị trí hiện tại của mọi vua.

## 6. Start Station (ô 01)

Khi vua đi qua hoặc dừng tại ô 01, vua tạm dừng ở Start và lần lượt thực hiện:

1. Nhận **Start bonus coin** (Đề xuất: +50).
2. **King Level +1**, tối đa level 5.
3. **Vua hồi đầy máu**, miễn phí.
4. Nhận **Income** của tất cả Plot đang sở hữu, tính theo level từng Plot, cộng thêm phần Farmer (mục 8).
5. Chọn **1 trong 3 Upgrade Card** random (mục 11).
6. **Nâng cấp Plot**: nâng được nhiều Plot, mỗi lần trả coin ("Spend X coin for next level"). Level Plot không vượt quá level vua.
7. **Hồi máu Plot / Resident**: trả coin để hồi máu. Level của Plot hoặc resident càng cao thì chi phí càng tăng.
8. **Tuyển Resident**: trả coin để tuyển Warrior/Farmer và đặt vào Plot (giới hạn Max Resident).
9. **Mua Item** ở cửa hàng.

Xong Start Station, vua đi nốt số bước còn lại.

Bước 1–5 là bắt buộc hoặc tự động. Bước 6–9 tùy chọn, có nút "Done" để đi tiếp. Thứ tự hiển thị các bước 6–9: **Đề xuất**, cần duyệt.

## 7. Plots

- Mua: dừng trên Plot trống thì được mua nếu đủ coin (coin ≥ giá). Plot mới mua ở **level 0**. Level tối đa của Plot là **5** và không vượt quá level vua.
- **Chi tiêu tự do:** mọi giao dịch chủ động (mua đất, nâng cấp, hồi máu, tuyển, mua item) chỉ kiểm tra đủ coin, được tiêu về 0. Còn ít coin thì rủi ro phá sản khi trả phí là do người chơi tự chịu.
- Chỉ số của Plot: Level, Price, Income, Fee (phí người khác trả), Health, Max Health, Defense, Max Resident. Tất cả phụ thuộc level (và có thể cả vùng của bản đồ).
- **Fee:** vua khác dừng trên Plot phải trả phí theo level của Plot, trừ khi chọn hoặc bị tấn công (mục 9).
- **Income:** chủ Plot nhận khi vua của mình hoàn thành vòng (Start Station bước 3).
- **Bị tấn công** (chỉ khi Plot không còn resident, xem mục 10.5):
  - Health về 0 → Plot tụt 1 level và hồi đầy máu theo Max Health của level mới.
  - Đang level 0 mà Health về 0 → mất đất, Plot trở lại trống. Người vừa phá được **mua ngay trong lượt đó**; nếu không mua thì người dừng lên sau được mua.
- Máu Plot không tự hồi. Chủ trả coin để hồi ở Start Station.
- **Dừng trên đất của chính mình:** được quản lý tại chỗ cho riêng mảnh đất đó: nâng cấp Plot, hồi máu Plot/resident, tuyển resident, nâng cấp resident. Chi phí giống ở Start.

## 8. Residents

- Tuyển bằng coin ở Start Station, đặt lên Plot của mình, mỗi Plot tối đa Max Resident.
- Mỗi resident có: Name, Level, Attack, Defense, Health, Plot đang đóng.
- Cả hai loại đều tham gia đánh và thủ khi Plot bị tấn công.

| Loại | Vai trò |
| --- | --- |
| Warrior | Attack / Defense / Health cao hơn. Khi vua chủ đứng trên Plot có Warrior của mình và xảy ra giao tranh tại đó, vua được cộng Attack/Defense. |
| Farmer | Chỉ số cơ bản. Tăng Income của Plot khi vua chủ về Start thu hoạch. |

- Residents trên cùng một Plot phòng thủ chung thành **một đội** (mục 10.4). Plot chỉ bị đánh trực tiếp khi không còn resident nào.
- Máu resident không tự hồi. Chủ trả coin để hồi ở Start Station.
- **Nâng cấp resident** (màn Resident detail có nút Upgrade): ở Start Station (mọi resident) hoặc khi dừng trên đất của mình (resident của đất đó). Trả coin; level resident không vượt quá level của Plot nó đóng.

## 9. Dừng trên đất của đối thủ

Vua A dừng trên Plot của B:

```text
Vua B có đang đứng trên Plot đó không?
├─ Có  → B quyết định (A thấy "You stand on other players plot, waiting for decision…")
│        ├─ Thu phí → A trả Fee
│        └─ Tấn công A → Fight vua đấu vua (10.3)
│                 ├─ B thắng → A trả Fee
│                 └─ A thắng → A không trả phí
└─ Không → A quyết định ("You get in other players plot. Do you want to attack on it?")
         ├─ No  → A trả Fee
         └─ Yes → Plot còn resident?
                  ├─ Có    → Fight với đội resident (10.4)
                  └─ Không → Fight với Plot (10.5)
```

- Popup "Another player break in your plot. Do you want to fight back?" ([63](ui/63-map-fight-back-prompt.png)) **bị bỏ**. Khi B có mặt, B nhận popup quyết định "Thu phí / Tấn công".
- Khi B vắng mặt, B vẫn được thông báo và xem trận đấu, nhưng không thao tác gì.

## 10. Fight

### 10.1 Luật chung của một trận

- Mỗi trận là **best of 3**: bên nào thắng **2 hiệp** trước thì thắng trận.
- Mỗi hiệp, mỗi bên **tự bấm Roll trên máy mình**. Bên không có người điều khiển (đội resident, Plot) do hệ thống tự đổ.
- **Điểm đánh = số xúc xắc (1–6) + Attack** (cộng bonus Warrior/item nếu có).
- Bên có điểm đánh cao hơn thắng hiệp. Hòa thì đổ lại.
- Bên thắng hiệp gây **sát thương = điểm đánh của bên thắng − Defense của bên thua**, tối thiểu 1.
- Máu về 0 giữa trận thì bên đó thua trận ngay.
- **Item:** mỗi bên được dùng item trước mỗi hiệp.
- **Rút lui:** người tấn công được rút lui giữa các hiệp. Rút lui tính như thua: dừng và trả Fee, giữ nguyên máu còn lại.
- Lucky không dùng trong Fight (xem mục 3).

Ví dụ (You: Attack 5, Defense 3, máu 50; Player 2: Attack 6, Defense 2, máu 80):

| Hiệp | You | Player 2 | Kết quả |
| --- | --- | --- | --- |
| 1 | đổ 4 → 9 | đổ 2 → 8 | You thắng, P2 mất 9 − 2 = 7 (80 → 73) |
| 2 | đổ 1 → 6 | đổ 5 → 11 | P2 thắng, You mất 11 − 3 = 8 (50 → 42) |
| 3 | đổ 6 → 11 | đổ 3 → 9 | You thắng 2 hiệp → **thắng trận**, P2 mất 9 (73 → 64) |

### 10.2 Vua hết máu

- Thua trận đang đánh, **mất lượt kế tiếp**, sau đó hồi về 50% Max Health.
- Hết máu **không** làm vua bị loại. Vua chỉ bị loại khi phá sản (mục 14).
- Vua hồi đầy máu miễn phí mỗi lần qua Start.

### 10.3 Vua đấu vua

- Xảy ra khi B đứng trên Plot của mình và chọn tấn công A.
- B được cộng bonus Attack/Defense từ Warrior đang đóng trên Plot đó (giá trị bonus: TBD).
- Kết quả về phí: B thắng thì A trả Fee; A thắng thì A không phải trả.

### 10.4 Đánh đội resident

Mọi resident trên Plot gộp thành **một đội**, đánh **một trận** chứ không đánh từng người:

- **Máu đội** = tổng máu các resident.
- **Attack / Defense đội** = Attack / Defense cao nhất trong đội, cộng 1 cho mỗi resident thêm.
  Ví dụ: 3 resident có Attack 4, 6, 3 → Attack đội = 6 + 2 = 8.
- Sát thương trừ vào máu đội và chia đều cho các resident. Máu đội càng thấp thì resident chết càng nhiều:
  - **Số resident còn sống = làm tròn lên(máu đội còn lại ÷ máu đội tối đa × số resident ban đầu)**. Ví dụ 5 resident, máu đội còn 40% → còn sống 2, chết 3.
  - Máu đội về 0 → toàn bộ resident chết.
  - Ai chết trước: resident **level thấp nhất** chết trước. Cùng level thì resident có **chỉ số yếu nhất** (tổng Attack + Defense + Max Health thấp nhất) chết trước.
- **A thắng trận:** A không trả Fee và **cướp một khoản coin theo level của Plot** (số coin: TBD). A dừng ở đó, lượt này không đánh tiếp vào Plot.
- **A thua trận:** A dừng và trả Fee. Đội resident giữ nguyên thiệt hại đã nhận.
- Plot chỉ bị đánh trực tiếp khi đội resident không còn ai.

### 10.5 Đánh Plot (không còn resident)

Plot là bên **thụ động**: không gây sát thương, chỉ chống đỡ. Trận vẫn là best of 3.

- Cách tính một hiệp: A có điểm đánh = xúc xắc + Attack. Plot có điểm chống = xúc xắc (hệ thống đổ) + Defense của Plot.
  - A cao hơn → A thắng hiệp, Plot mất (điểm đánh của A − Defense Plot), tối thiểu 1.
  - Plot cao hơn hoặc bằng → Plot thắng hiệp, A không mất máu (Plot không đánh trả).
- Máu Plot về 0 → trận kết thúc ngay, Plot tụt 1 level và hồi đầy máu (mục 7). Đang level 0 thì Plot mất và **A được mua ngay**.
- A thắng 2 hiệp mà Plot chưa hết máu → không chiếm được đất. Plot giữ thiệt hại. A không trả Fee.
- Plot thắng 2 hiệp → A dừng và trả Fee.

## 11. Upgrade Card

- Ở Start Station, hệ thống random 3 thẻ từ pool, mỗi thẻ có giá trị random. Người chơi chọn 1 → popup xác nhận "You have picked <Max Health +10>. Are you sure?" → "Congratulation! You got …".
- Pool: Max Health, Attack, Defense, Lucky, Coin.
- Hiệu lực: cộng **vĩnh viễn** vào vua. Thẻ Coin cộng coin ngay.
- Lucky càng cao thì giá trị random của thẻ càng tốt.
- Khoảng giá trị random của từng loại: **TBD** (thiết kế ví dụ: Max Health +10, Attack +5, Defense +3, Lucky +1, Coin +5).

## 12. Items

- Nguồn: mua ở Start Station, rơi ngẫu nhiên khi dừng trên Plot (tỉ lệ tăng theo Lucky), phần thưởng Event.
- 2 loại:
  - **Tiêu hao:** dùng một lần, số lượng xN giảm.
  - **Trang bị:** giữ vĩnh viễn, tác dụng liên tục.
- Dùng được bất kỳ lúc nào trong lượt của mình.
- Ví dụ trong thiết kế: Ngựa (+3 điểm vào kết quả xúc xắc), đùi thịt, xúc xắc nhiều mặt, lưỡi liềm. Danh sách và hiệu ứng cụ thể: **TBD**.

## 13. Events

- 2 phạm vi: **toàn bàn** (ảnh hưởng mọi người) và **cá nhân**.
- Có thời hạn tính theo lượt (vd "1 Turn").
- Nguồn kích hoạt: ngẫu nhiên khi dừng trên Plot (event cá nhân, Lucky cao thì dễ gặp event có lợi), hoặc do hệ thống theo điều kiện (vd sau 3 vòng thì vòng 4 random kích hoạt một sự kiện). Điều kiện cụ thể: **TBD**. Engine cần cho phép thêm trigger mới mà không sửa luật lõi.
- Ví dụ: Harvest Festival, "You will get 50 coin immediately", 1 Turn.
- Màn Events: lịch sử sự kiện và thời hạn còn lại.

## 14. Bị loại và chiến thắng

- Vua bị loại **chỉ khi không đủ coin trả phí** (phá sản).
  - Người bị loại thấy màn mặt buồn, sau đó thành khán giả: xem mọi màn, HUD gạch chéo đỏ, chữ "Game Over".
  - Toàn bộ Plot và residents của họ trở về trống.
- Còn một vua duy nhất → người đó thắng → màn mặt cười.
- Cuối trận mọi người thấy bảng xếp hạng: thứ hạng theo thứ tự bị loại, người thắng đứng đầu.
  - Play Again: cả nhóm quay về Lobby cùng phòng.
  - Quit: về màn Welcome.
- Vua hết Health không bị loại (mục 10.2).

## 15. Bảng tham số cân bằng

Bảng số đề xuất chi tiết và kết quả mô phỏng: [balance.md](balance.md) (chờ duyệt).

Mọi con số sẽ nằm trong file config của `packages/core`, không hardcode trong luật.

| Nhóm | Tham số |
| --- | --- |
| King | Chỉ số khởi đầu, level tối đa, Start bonus coin |
| Plot | Giá mua theo vùng; Fee, Income, Health, Defense, Max Resident theo level; chi phí nâng từng level; level tối đa |
| Resident | Giá tuyển, chỉ số Warrior/Farmer theo level, chi phí nâng cấp, bonus Warrior cho vua, Income Farmer |
| Upgrade Card | Pool, trọng số random, khoảng giá trị |
| Item | Danh sách, giá, loại, hiệu ứng, tỉ lệ rơi |
| Event | Danh sách, phạm vi, thời hạn, điều kiện kích hoạt |
| Fight | Bonus Warrior cho vua, coin cướp theo level Plot, chi phí hồi máu Plot/Resident theo level |

## 16. Câu hỏi còn mở

1. Các con số cân bằng (mục 15).
2. Lucky: công thức cụ thể ảnh hưởng tỉ lệ rơi item, giá trị thẻ, event cá nhân.
3. Danh sách item, danh sách event và điều kiện kích hoạt event toàn bàn.
