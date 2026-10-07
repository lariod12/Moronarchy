# Moronarchy — Bảng số cân bằng (đề xuất)

> Trạng thái: **Q1–Q3 đã duyệt; các con số còn lại là đề xuất — chờ duyệt**. Mọi con số sẽ nằm trong `packages/core/src/content/` để chỉnh mà không phải sửa luật.
> Luật: [game-design.md](game-design.md). Mục 0 có 3 quyết định cần bạn chốt trước, vì chúng ảnh hưởng mạnh đến độ dài ván.

## 0. Ba quyết định (đã duyệt: Q1, Q2, Q3 đều theo đề xuất)

Bảng số được kiểm tra bằng một mô phỏng đơn giản (bot tự chơi hàng trăm ván, chưa tính item/event). Mô phỏng phát hiện 3 vấn đề:

### Q1. Đánh đất mà không phá được thì có phải trả phí không?

Luật đã duyệt (GDD 10.5): A thắng 2 hiệp mà đất chưa hết máu thì **không trả phí**. Nhưng đất không đánh trả, nên A gần như luôn thắng 2 hiệp. Hệ quả là người chơi chỉ cần **luôn bấm tấn công khi đất không có resident** là né được phí.

| Mô phỏng 4 người | Bot không tấn công | Bot luôn tấn công |
| --- | ---: | ---: |
| Giữ luật hiện tại (thắng = miễn phí) | ~43 round | **~250 round, một nửa số ván quá 300 round vẫn chưa xong** |
| Đổi: chưa phá được đất thì vẫn trả phí | ~43 round | ~60 round |

Kể cả có thêm lạm phát (Q2), nếu giữ luật hiện tại thì bot hay tấn công vẫn cần ~257 round.

**Đề xuất:** đổi luật thành "chỉ miễn phí khi phá được đất (đất tụt level hoặc mất)". Thắng 2 hiệp mà đất chưa hết máu thì vẫn trả phí; thiệt hại gây cho đất vẫn được giữ.

### Q2. Thêm "Lạm phát hoàng gia" để ván không kéo dài vô tận?

Ván chỉ kết thúc khi còn một người, mà xúc xắc 1–6 trên bản đồ 40 ô thì trung bình **~11 lượt mới hết một vòng**. Không có áp lực cuối trận thì ván rất dài.

**Đề xuất:** từ **round 20**, phí đất tăng **+25%**, sau đó cứ mỗi 5 round tăng thêm 25% (round 20: ×1.25, round 25: ×1.5, round 30: ×1.75…). TopBar hiển thị hệ số lạm phát hiện tại.

| Mô phỏng (số round trung vị đến khi còn 1 người) | 2 người | 4 người | 6 người |
| --- | ---: | ---: | ---: |
| Không lạm phát, bot thận trọng | 41 | 43 | 42 |
| Không lạm phát, bot hay tấn công | 48 | 60 | 68 |
| **Có lạm phát, bot thận trọng** | **30** | **35** | **35** |
| **Có lạm phát, bot hay tấn công** | **36** | **42** | **49** |

Người đầu tiên phá sản (có lạm phát, 4 người): khoảng round 18–25.

**Ước tính thời gian thực:** mỗi lượt khoảng 20–40 giây (nhận lượt, đổ, đi, quyết định). Ván 4 người × 35–42 round ≈ **50–100 phút**. Nếu muốn ván ngắn hơn (30–45 phút), có thể bắt đầu lạm phát từ round 12 hoặc tăng phí. Bạn cho biết thời lượng mong muốn để mình chỉnh.

### Q3. Vua lên level có tăng chỉ số không?

Luật hiện tại chỉ nói level vua giới hạn level đất. **Đề xuất:** mỗi level vua **+10 Max Health, +1 Attack**, để vua đi nhiều vòng thì mạnh dần, đủ sức đánh đội resident đã nâng cấp.

## 1. Vua

| Chỉ số | Khởi đầu | Mỗi level (Q3) |
| --- | ---: | ---: |
| Level | 1 (tối đa 5) | |
| Coin | 300 | |
| Health / Max Health | 100 | +10 Max Health |
| Attack | 5 | +1 |
| Defense | 3 | |
| Lucky | 0 | |

- Start bonus mỗi lần qua Start: **+100 coin**.
- Hết máu: mất lượt kế tiếp, sau đó hồi về 50% Max Health.
- Qua Start: hồi đầy máu miễn phí.

## 2. Đất (Plot)

Bản đồ chia 4 vùng, giá tăng dần theo vùng. Mọi chỉ số tính theo **giá gốc của vùng × hệ số theo level**.

| Level | L0 | L1 | L2 | L3 | L4 | L5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Phí (× giá gốc) | 0.25 | 0.5 | 0.9 | 1.4 | 2.0 | 2.8 |
| Income mỗi vòng (× giá gốc) | 0.05 | 0.10 | 0.18 | 0.28 | 0.40 | 0.55 |
| Chi phí nâng lên level này (× giá gốc) | — | 0.5 | 0.75 | 1.0 | 1.25 | 1.5 |
| Health | 15 | 25 | 35 | 50 | 65 | 80 |
| Defense | 0 | 1 | 2 | 3 | 4 | 5 |
| Max Resident | 1 | 2 | 3 | 3 | 4 | 5 |

Bảng tính sẵn:

| Vùng | Giá mua | Phí L0 / L1 / L2 / L3 / L4 / L5 | Income/vòng L0 … L5 | Chi phí nâng L0→1 … L4→5 | Tổng vốn để lên L5 |
| --- | ---: | --- | --- | --- | ---: |
| 02–10 | 60 | 15 / 30 / 54 / 84 / 120 / 168 | 3 / 6 / 11 / 17 / 24 / 33 | 30 / 45 / 60 / 75 / 90 | 360 |
| 11–20 | 80 | 20 / 40 / 72 / 112 / 160 / 224 | 4 / 8 / 14 / 22 / 32 / 44 | 40 / 60 / 80 / 100 / 120 | 480 |
| 21–30 | 100 | 25 / 50 / 90 / 140 / 200 / 280 | 5 / 10 / 18 / 28 / 40 / 55 | 50 / 75 / 100 / 125 / 150 | 600 |
| 31–40 | 120 | 30 / 60 / 108 / 168 / 240 / 336 | 6 / 12 / 22 / 34 / 48 / 66 | 60 / 90 / 120 / 150 / 180 | 720 |

- Phí tăng nhanh hơn income: đất cấp cao là "bẫy" chính gây phá sản. Income chỉ là tiền thưởng phụ cho người đầu tư.
- **Hồi máu đất:** chi phí hồi đầy = 10 + 15 × level (L0: 10 … L5: 85). Hồi một phần thì tính theo tỉ lệ máu thiếu, làm tròn lên.

## 3. Residents

| | Giá tuyển | Health | Attack | Defense | Mỗi level thêm | Chi phí nâng (level hiện tại → +1) |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Warrior | 70 | 30 | 4 | 2 | +8 HP, +1 Atk, +1 Def | 40 × level hiện tại |
| Farmer | 40 | 20 | 1 | 0 | +5 HP, +1 Atk, +1 Def | 25 × level hiện tại |

| Level | Warrior HP / Atk / Def | Farmer HP / Atk / Def |
| --- | --- | --- |
| 1 | 30 / 4 / 2 | 20 / 1 / 0 |
| 2 | 38 / 5 / 3 | 25 / 2 / 1 |
| 3 | 46 / 6 / 4 | 30 / 3 / 2 |
| 4 | 54 / 7 / 5 | 35 / 4 / 3 |
| 5 | 62 / 8 / 6 | 40 / 5 / 4 |

- **Farmer:** +10 Income mỗi vòng × level Farmer (Farmer L1 hoàn vốn sau ~4 vòng).
- **Bonus Warrior cho vua** (vua đứng trên đất mình khi giao tranh): mỗi Warrior trên đất đó **+2 Attack, +1 Defense**.
- **Hồi máu resident:** chi phí hồi đầy = 5 + 5 × level. Hồi một phần thì tính theo tỉ lệ.
- **Cướp coin khi thắng đội resident:** **2 × phí hiện tại của đất**, lấy từ coin của chủ đất (tối đa bằng số coin chủ đang có; không làm chủ phá sản).

## 4. Fight — kết quả mô phỏng với bảng số trên

| Trận | Kết quả |
| --- | --- |
| Vua L1 đấu vua L1 | Trung bình 3 hiệp, mỗi bên mất ~8 máu |
| Vua L1 vs 1 Farmer | Vua thắng ~100% |
| Vua L1 vs 1 Warrior | Vua thắng 75%, mất ~5 máu |
| Vua L1 vs Farmer + Warrior / 2 Warrior | Vua thắng ~50%, mất ~8 máu |
| Vua L1 vs 3 Warrior | Vua thắng 24%, mất ~12 máu |
| Vua L5 vs 3 Warrior L1 | Vua thắng 98% (resident cần nâng cấp theo) |
| Vua L1 đánh đất L0 | Phá được trong 1 trận: 85% |
| Vua L1 đánh đất L1 / L2 | Không phá được trong 1 trận; đất còn ~10 / ~22 máu |
| Vua L5 đánh đất L1 | Phá được trong 1 trận: 28% |
| Vua đánh đất L3 trở lên | Cần 3–6 lần tấn công liên tiếp (nếu chủ không hồi máu) |

Ý nghĩa: đất level 0 rất mong manh, nên mua xong cần nâng cấp sớm. Đất cấp cao gần như chỉ mất khi bị đánh liên tục mà chủ bỏ bê không hồi máu.

## 5. Upgrade Card

Mỗi lần qua Start, random **3 thẻ khác loại** theo trọng số:

| Thẻ | Trọng số | Giá trị (random 1 trong 3 mức) |
| --- | ---: | --- |
| Max Health | 25 | +10 / +15 / +20 |
| Attack | 25 | +1 / +2 / +3 |
| Defense | 25 | +1 / +2 / +3 |
| Lucky | 10 | +1 / +2 |
| Coin | 15 | +50 / +100 / +150 |

- Thẻ Max Health cũng hồi thêm đúng lượng máu đó.

## 6. Lucky

| Ảnh hưởng | Công thức |
| --- | --- |
| Rơi item khi dừng trên đất | 10% + 3% × Lucky, tối đa 40% |
| Event cá nhân khi dừng trên đất | 10% cố định. Xác suất là event tốt: 50% + 5% × Lucky, tối đa 90% |
| Upgrade Card | Giá trị mỗi thẻ được random (1 + Lucky ÷ 2, làm tròn xuống) lần, lấy mức cao nhất |

- Mỗi lần dừng trên đất chỉ xảy ra tối đa 1 việc: xét event trước; không có event thì xét rơi item.
- Không xét rơi item/event khi dừng ở ô Start.

## 7. Items

- Túi đồ: mỗi item tiêu hao giữ tối đa **×5**; mỗi trang bị chỉ có **1**.
- Item tiêu hao vừa mua ở Start vừa rơi ngẫu nhiên. Trang bị chỉ mua ở Start.

| Item | Loại | Giá | Hiệu ứng | Dùng khi |
| --- | --- | ---: | --- | --- |
| Ngựa | Tiêu hao | 40 | +3 vào kết quả xúc xắc di chuyển | Trước khi đổ |
| Xúc xắc may mắn | Tiêu hao | 35 | Đổ lại xúc xắc di chuyển 1 lần | Sau khi thấy kết quả, trước khi đi |
| Đùi thịt | Tiêu hao | 30 | Vua hồi 30 máu | Trong lượt, hoặc trước một hiệp |
| Tù và chiến | Tiêu hao | 40 | +3 Attack đến hết trận | Trước một hiệp |
| Khiên gỗ | Tiêu hao | 40 | +3 Defense đến hết trận | Trước một hiệp |
| Liềm | Tiêu hao | 50 | Thu hoạch ngay Income của 1 đất mình | Trong lượt |
| Búa sửa | Tiêu hao | 45 | Hồi đầy máu 1 đất mình (từ xa) | Trong lượt |
| Kiếm sắt | Trang bị | 160 | +2 Attack vĩnh viễn | Tự động |
| Giáp sắt | Trang bị | 160 | +2 Defense vĩnh viễn | Tự động |
| Cỏ bốn lá | Trang bị | 120 | +2 Lucky vĩnh viễn | Tự động |

Item rơi ngẫu nhiên: chỉ item tiêu hao, cùng tỉ lệ cho mọi loại.

## 8. Events

### 8.1 Event cá nhân (khi dừng trên đất, mục 6)

| Event | Loại | Trọng số | Hiệu ứng |
| --- | --- | ---: | --- |
| Rương báu | Tốt | 30 | +60 coin |
| Thương nhân lang thang | Tốt | 25 | Nhận 1 item tiêu hao ngẫu nhiên |
| Suối hồi phục | Tốt | 20 | Vua hồi đầy máu |
| Người tình nguyện | Tốt | 15 | Nhận 1 Farmer L1 miễn phí trên một đất còn chỗ (không còn chỗ thì +40 coin) |
| Phúc lành | Tốt | 10 | +1 Lucky vĩnh viễn |
| Móc túi | Xấu | 35 | −40 coin (không xuống dưới 0, không gây phá sản) |
| Phục kích | Xấu | 30 | Vua −25 máu |
| Bão | Xấu | 25 | Một đất ngẫu nhiên của mình mất 50% máu hiện tại |
| Đào ngũ | Xấu | 10 | Một resident ngẫu nhiên của mình bỏ đi |

### 8.2 Event toàn bàn (hệ thống kích hoạt)

- Từ **round 4**, đầu mỗi round có **20%** khả năng kích hoạt một event toàn bàn, nếu chưa có event toàn bàn nào đang chạy.
- Thời hạn tính theo **round**. Thiết kế ghi "1 Turn"; đề xuất hiển thị "1 Round" cho rõ.

| Event | Thời hạn | Hiệu ứng |
| --- | --- | --- |
| Lễ hội mùa màng | Tức thì | Mọi vua +50 coin |
| Dịch bệnh | Tức thì | Mọi resident mất 30% máu hiện tại |
| Ngày thu thuế | Tức thì | Mọi vua mất 10% coin (không gây phá sản) |
| Hiệp ước hòa bình | 1 round | Không ai được tấn công (phải trả phí) |
| Cơn sốt chiến tranh | 1 round | Mọi bên +2 Attack trong Fight |
| Chợ phiên sôi động | 1 round | Phí đất ×1.5 |
| Năm được mùa | 2 round | Income ×2 khi qua Start |

## 9. Mô phỏng

- Bot đơn giản: mua đất khi còn dư ≥ 60 coin; ở Start nâng đất, tuyển xen kẽ Farmer/Warrior, hồi máu khi còn dư ≥ 80 coin.
- 2 kiểu bot: thận trọng (không bao giờ tấn công) và hay tấn công (tấn công khi phí ≥ 15).
- Chưa mô phỏng item, event, vua đấu vua, bonus Warrior. Đây là để kiểm tra nhịp kinh tế, không phải để dự đoán chính xác.
- Khi `packages/core` được viết lại, mô phỏng sẽ chạy trên đúng luật thật (bot dùng core) để chỉnh số lần sau.
