# Checklist nghiệm thu — Challenge 09: Claims Analytics Dashboard

> Đối chiếu từng yêu cầu trong đề với hiện trạng triển khai. Bằng chứng = unit test hoặc bước verify trên preview.

## 1. Dataset (5,000 claims, 13 cột)

- [x] 5,000 dòng, đủ 13 cột đúng schema đề — test `generator — kích thước & format`
- [x] `claim_id` dạng CLM-NNNNN, duy nhất; `policy_id` dạng POL-NNNNN, 1 policy có nhiều claims
- [x] `member_name` realistic theo nước (Thái / Việt / Hong Kong)
- [x] `claim_type` 4 enum, outpatient chiếm đa số (~60%) — test `outpatient chiếm đa số`
- [x] `diagnosis_icd10` đúng 20 mã ICD-10 thật, gắn theo claim type (dental → K0x, maternity → O8x)
- [x] `submitted_amount` ∈ [500, 2,000,000], lệch phải (log-normal, median < mean) — test `skew`
- [x] `approved_amount` = 0 cho REJECTED, ≤ submitted cho APPROVED — test ràng buộc nghiệp vụ
- [x] `status` 4 enum; rejection rate ~15% (13–17% trên toàn bộ 5,000 claims) — test thống kê
- [x] `submitted_date` phủ đủ 12 tháng 2024
- [x] `processed_date` = submitted + 1–30 ngày, null khi PENDING; trung bình ~7 ngày — test thống kê
- [x] `assessor` 5 tên, `insurer` 3 tên, `country` 3 nước
- [x] Dataset commit vào repo (`public/data/claims.csv`) + tái lập được (seeded PRNG, test đối chiếu file)

## 2. KPI Cards

- [x] Total claims count — test `computeKpis`
- [x] Approval rate (%) = APPROVED/(APPROVED+REJECTED), có chú thích ⓘ quy ước — test riêng
- [x] Average processing time (days), mọi claim có `processed_date` — test riêng
- [x] Total approved amount (compact + hover xem số đầy đủ)
- [x] Average claim amount (trung bình submitted_amount)
- [x] Tập rỗng không vỡ: hiển thị "—", không NaN/chia 0 — test edge case

## 3. Charts (6/6)

- [x] Claims by status — donut, legend + tooltip (count + share %)
- [x] Claims over time — line chart, **toggle week/month**, ISO week đúng biên năm (test `2024-12-30 → 2025-W01`), lấp period trống bằng 0
- [x] Top 10 diagnoses by frequency — horizontal bar, tooltip kèm mô tả ICD-10
- [x] Top 10 diagnoses by total cost — horizontal bar (tổng approved_amount)
- [x] Processing time distribution — histogram bin 3 ngày [1–30] trên mọi claim có `processed_date`, test biên bin
- [x] Approval rate by insurer — **grouped bar** (nhóm insurer × claim type), tooltip kèm overall

## 4. Interactivity

- [x] Global filters: date range (from/to), claim type, insurer, country, status (multi-select)
- [x] Mọi filter áp **đồng thời** lên KPI + 6 charts + table — kiến trúc 1 pipeline `applyFilters`; verify chéo: lọc APPROVED → filter note = KPI = table = 3,096
- [x] Click bar diagnosis (cả 2 chart) → table hiển thị claims của diagnosis đó; bar được highlight, bar khác mờ đi; click lại hoặc ✕ Clear để bỏ — verify drill-down J06.9 → 567 dòng
- [x] Hover tooltip giá trị chính xác trên mọi chart — verify preview (histogram "1–3 days: 768")
- [x] Nút Reset filters + dòng "Showing X / 5,000 claims"

## 5. Data Table

- [x] Hiển thị đủ 13 cột nguồn, sort bằng click hoặc bàn phím; null processed_date luôn xuống cuối — test `sortClaims`
- [x] Paginate 20 dòng/trang («, Prev, Next, »), clamp trang khi đổi filter — test `paginate`
- [x] Phản ứng theo mọi filter đang active + drill-down
- [x] Export CSV đúng tập đã filter + sort, đủ 13 cột, escape chuẩn (phẩy/quote) — test `claimsToCsv`

## 6. Evaluation criteria của đề

- [x] All KPI calculations are correct — 38 unit tests trên fixture biết trước đáp án
- [x] Charts readable: labels, legends, tooltips đầy đủ
- [x] Filters work across all visualizations simultaneously — verify chéo 3 nguồn
- [x] Drill-down chart → table works correctly
- [x] Dashboard loads < 3s — static build, entry JS ~75KB gzip; chart library code-split thành chunks bất đồng bộ
- [x] Responsive desktop + tablet — verify 768px (KPI 3→2 cột, charts 1 cột, không tràn ngang; table overflow-x cuộn riêng)

## 7. Chất lượng & quy trình

- [x] `npm test`: **56/56 passed** (41 lib + 15 generator statistical)
- [x] `tsc --noEmit` sạch (strict mode)
- [x] `npm run build` thành công
- [x] Toàn bộ logic tính toán là pure function trong `src/lib/` — không import React, test không cần render
- [x] Quy ước nghiệp vụ ghi rõ trong README + chú thích ⓘ ngay trên UI
- [x] CSV loader validate đúng schema 13 cột, enum, ID, amount, date và business rules; lỗi có số dòng
- [x] Date filters có label; sort headers, Week/Month và diagnosis drill-down hỗ trợ bàn phím/ARIA

## 8. Submission

- [ ] Push lên GitHub repository
- [ ] Deploy free hosting (Vercel/Netlify) + cung cấp live URL

> Hai mục cuối cần tài khoản GitHub/Vercel của bạn — codebase đã sẵn sàng deploy
> (SPA tĩnh, không cần config thêm).
