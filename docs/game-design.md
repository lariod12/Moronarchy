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
| Lucky | 0 | Tác dụng TBD |

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
  - **Plot:** đất mua được.
  - **Ô sự kiện / thẻ:** nhận Event, Item hoặc thẻ. Ô nào là ô sự kiện: **TBD**.
- Hiển thị trên Map: ô xám là đất của mình, icon người là vị trí vua của mình. Cách hiển thị đất và vị trí của người khác: **TBD** (xem screen spec).
- Màn Steps / Dice Status: vị trí hiện tại của mọi vua.

## 6. Start Station (ô 01)

Khi vua đi qua hoặc dừng tại ô 01, vua tạm dừng ở Start và lần lượt thực hiện:

1. Nhận **Start bonus coin** (Đề xuất: +50).
2. **King Level +1** (giới hạn level tối đa: TBD).
3. Nhận **Income** của tất cả Plot đang sở hữu, tính theo level từng Plot, cộng thêm phần Farmer (mục 8).
4. Chọn **1 trong 3 Upgrade Card** random (mục 11).
5. **Nâng cấp Plot**: nâng được nhiều Plot, mỗi lần trả coin ("Spend X coin for next level"). Level Plot không vượt quá level vua.
6. **Tuyển Resident**: trả coin để tuyển Warrior/Farmer và đặt vào Plot (giới hạn Max Resident).
7. **Mua Item** ở cửa hàng.

Xong Start Station, vua đi nốt số bước còn lại.

Bước 1–4 là bắt buộc hoặc tự động. Bước 5–7 tùy chọn, có nút "Done" để đi tiếp. Thứ tự hiển thị các bước 5–7: **Đề xuất**, cần duyệt.

## 7. Plots

- Mua: dừng trên Plot trống thì được mua nếu đủ coin. Plot mới mua ở **level 0**.
- Chỉ số của Plot: Level, Price, Income, Fee (phí người khác trả), Health, Max Health, Defense, Max Resident. Tất cả phụ thuộc level (và có thể cả vùng của bản đồ).
- **Fee:** vua khác dừng trên Plot phải trả phí theo level của Plot, trừ khi chọn hoặc bị tấn công (mục 9).
- **Income:** chủ Plot nhận khi vua của mình hoàn thành vòng (Start Station bước 3).
- **Bị tấn công:**
  - Health về 0 → Plot tụt 1 level và hồi đầy máu theo Max Health của level mới.
  - Đang level 0 mà Health về 0 → mất đất, Plot trở lại trống, residents (nếu còn) biến mất; người dừng lên sau được mua.
- Dừng trên đất của chính mình: **TBD** (vd không có gì, hoặc được tuyển/di chuyển resident).

## 8. Residents

- Tuyển bằng coin ở Start Station, đặt lên Plot của mình, mỗi Plot tối đa Max Resident.
- Mỗi resident có: Name, Level, Attack, Defense, Health, Plot đang đóng.
- Cả hai loại đều tham gia đánh và thủ khi Plot bị tấn công.

| Loại | Vai trò |
| --- | --- |
| Warrior | Attack / Defense / Health cao hơn. Khi vua chủ đứng trên Plot có Warrior của mình và xảy ra giao tranh tại đó, vua được cộng Attack/Defense. |
| Farmer | Chỉ số cơ bản. Tăng Income của Plot khi vua chủ về Start thu hoạch. |

- Muốn tấn công Plot thì phải hạ hết residents trên Plot đó trước.
- Nâng cấp resident (màn Resident detail có nút Upgrade): thời điểm và chi phí **TBD** (đề xuất: chỉ ở Start Station, giống Plot).

## 9. Dừng trên đất của đối thủ

Vua A dừng trên Plot của B:

```text
Vua B có đang đứng trên Plot đó không?
├─ Có  → B quyết định (A thấy "You stand on other players plot, waiting for decision…")
│        ├─ Thu phí → A trả Fee
│        └─ Tấn công A → Fight (vua B + bonus Warrior vs vua A)
└─ Không → A quyết định ("You get in other players plot. Do you want to attack on it?")
         ├─ No → A trả Fee
         └─ Yes → A đánh lần lượt residents → rồi đánh Plot (mục 7)
```

- B được báo khi có người xông vào đất ("Another player break in your plot. Do you want to fight back?"). Fight back chỉ có khi vua B đứng tại Plot đó. Nếu B không ở đó thì residents tự thủ.
- Khi B đứng tại Plot, quan hệ giữa popup "fight back" của B và lựa chọn "thu phí / tấn công": **TBD**, chốt khi phỏng vấn phần Fight.

## 10. Fight — TBD

Phần này sẽ phỏng vấn riêng. Những gì đã biết từ thiết kế:

- Màn Fight: hai bên có thanh máu (vd 50/100 vs 80/100), avatar, xúc xắc giữa màn và nút Roll.
- Có ô hiệu ứng trạng thái phía trên avatar (màn 92-fight-status).

Còn cần chốt: công thức sát thương, số hiệp, ai đổ xúc xắc, hậu quả khi vua hết Health, phần thưởng khi thắng, tác dụng của Lucky.

## 11. Upgrade Card

- Ở Start Station, hệ thống random 3 thẻ từ pool, mỗi thẻ có giá trị random. Người chơi chọn 1 → popup xác nhận "You have picked <Max Health +10>. Are you sure?" → "Congratulation! You got …".
- Pool: Max Health, Attack, Defense, Lucky, Coin.
- Hiệu lực: cộng **vĩnh viễn** vào vua. Thẻ Coin cộng coin ngay.
- Khoảng giá trị random của từng loại: **TBD** (thiết kế ví dụ: Max Health +10, Attack +5, Defense +3, Lucky +1, Coin +5).

## 12. Items

- Nguồn: mua ở Start Station, rơi từ ô đất/ô sự kiện, phần thưởng Event.
- 2 loại:
  - **Tiêu hao:** dùng một lần, số lượng xN giảm.
  - **Trang bị:** giữ vĩnh viễn, tác dụng liên tục.
- Dùng được bất kỳ lúc nào trong lượt của mình.
- Ví dụ trong thiết kế: Ngựa (+3 điểm vào kết quả xúc xắc), đùi thịt, xúc xắc nhiều mặt, lưỡi liềm. Danh sách và hiệu ứng cụ thể: **TBD**.

## 13. Events

- 2 phạm vi: **toàn bàn** (ảnh hưởng mọi người) và **cá nhân**.
- Có thời hạn tính theo lượt (vd "1 Turn").
- Nguồn kích hoạt: ô sự kiện, hoặc do hệ thống theo điều kiện (vd sau 3 vòng thì vòng 4 random kích hoạt một sự kiện). Điều kiện cụ thể: **TBD**. Engine cần cho phép thêm trigger mới mà không sửa luật lõi.
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
- Vua hết Health thì có bị loại không: **TBD** (theo phỏng vấn thì hiện tại là không, chờ phần Fight).

## 15. Bảng tham số cân bằng (TBD)

Mọi con số sẽ nằm trong file config của `packages/core`, không hardcode trong luật.

| Nhóm | Tham số |
| --- | --- |
| King | Chỉ số khởi đầu, level tối đa, Start bonus coin |
| Plot | Giá mua theo vùng; Fee, Income, Health, Defense, Max Resident theo level; chi phí nâng từng level; level tối đa |
| Resident | Giá tuyển, chỉ số Warrior/Farmer theo level, chi phí nâng cấp, bonus Warrior cho vua, Income Farmer |
| Upgrade Card | Pool, trọng số random, khoảng giá trị |
| Item | Danh sách, giá, loại, hiệu ứng, tỉ lệ rơi |
| Event | Danh sách, phạm vi, thời hạn, điều kiện kích hoạt |
| Fight | Công thức (TBD) |

## 16. Câu hỏi còn mở

1. Toàn bộ hệ thống Fight (mục 10).
2. Các con số cân bằng (mục 15).
3. Ô nào là ô sự kiện; dừng trên đất của mình thì sao.
4. Level tối đa của vua và của Plot.
5. Tác dụng của Lucky.
6. Nâng cấp resident: thời điểm và chi phí.
7. Mua Plot trống: có cần giữ lại ít nhất 1 coin sau khi mua không (code cũ có quy tắc này).
