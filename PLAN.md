# AI Challenge 09 — Claims Analytics Dashboard: Phân tích & Plan triển khai

> Đề bài: `AI_Challenge_09.md` trong cùng folder.
> Công nghệ chọn: **ReactJS** (Vite + TypeScript + Vitest) + **Recharts**, nhất quán với challenge-04→07.
> Tài liệu này lưu phân tích, quyết định nghiệp vụ và kế hoạch đã dùng để triển khai code hiện tại.

---

## 1. Phân tích bài toán

### 1.1. Bản chất bài toán

Đây là bài toán **analytics dashboard thuần client-side** trên dataset tĩnh 5,000 dòng.
Khác challenge-07 (form state + conditional logic), độ khó của bài này nằm ở **3 trục**:

1. **Data generation đúng phân phối** — đề chấm "realistic distributions": amount lệch
   phải (most small, few large), rejection ~15%, processing time trung bình ~7 ngày,
   outpatient chiếm đa số. Dataset sai thì mọi chart phía sau đều "nhìn giả".
2. **Tính đúng KPI/aggregation + filter nhất quán** — 5 KPI, 6 chart, 1 table đều phải
   phản ánh **cùng một tập claims đã filter**. Đây là tiêu chí chấm nặng nhất
   (*"All KPI calculations are correct"*, *"Filters work across all visualizations
   simultaneously"*). Cách duy nhất bảo đảm: một pipeline filter duy nhất → mọi thứ
   derive từ kết quả đó.
3. **Interactivity đúng spec** — drill-down click diagnosis bar → table, tooltip,
   sort/paginate/export CSV, responsive desktop + tablet.

Không có backend: CSV được generate sẵn (commit vào repo theo yêu cầu Submission), app
fetch + parse lúc load. 5,000 dòng là nhỏ — mọi aggregation tính trong memory, không cần
virtualization hay worker; mục tiêu "< 3s load" đạt dễ với static hosting.

### 1.2. Phân rã yêu cầu

| Khối | Yêu cầu | Ghi chú kỹ thuật |
|---|---|---|
| **Dataset** | 5,000 claims, 13 cột, phân phối realistic | Script generator riêng, seeded RNG để tái lập |
| **KPI cards** | Total claims, approval rate %, avg processing days, total approved, avg claim amount | Pure functions trên filtered set |
| **Charts** | Donut status · Line theo thời gian (week/month toggle) · 2 bar ngang top-10 diagnosis (frequency & cost) · Histogram processing time · Grouped bar approval rate theo insurer | Recharts, tất cả nhận data từ selectors |
| **Filters** | Date range, claim type, insurer, country, status — áp toàn cục | 1 filter state + 1 hàm `applyFilters` duy nhất |
| **Drill-down** | Click bar diagnosis → table hiển thị claims của diagnosis đó | Là 1 chiều filter phụ (`selectedDiagnosis`), có nút clear |
| **Table** | Sort, paginate, theo filter, export CSV | Sort/paginate client-side; export đúng escaping |

### 1.3. Điểm mờ của đề — chốt quy ước trước khi code

Đề có nhiều chỗ không quy định rõ; mỗi chỗ chốt một quy ước, ghi vào README và hiển thị
chú thích (ⓘ) ngay trên UI ở KPI tương ứng:

1. **Approval rate tính trên mẫu số nào?** PENDING/IN_REVIEW chưa có kết cục.
   → Chốt: `APPROVED / (APPROVED + REJECTED)` — tỷ lệ trên các claims **đã quyết định**
   (chuẩn ngành; tính trên tổng sẽ làm rate dao động theo lượng pending). Đây là KPI riêng;
   yêu cầu dataset "rejection rate ~15%" vẫn được kiểm trên **toàn bộ 5,000 claims**.
2. **`approved_amount` của PENDING/IN_REVIEW là gì?** Đề chỉ nói "0 for rejected,
   ≤ submitted for others". → Chốt: PENDING/IN_REVIEW = **0** (chưa duyệt thì chưa có
   tiền duyệt — vẫn thỏa "≤ submitted"); APPROVED = 70–100% submitted (mô phỏng
   partial approval). "Total approved amount" vì thế chỉ đến từ claims APPROVED.
3. **`processed_date` của IN_REVIEW?** Đề chỉ nói "null for PENDING".
   → Theo đề **literal**: IN_REVIEW có processed_date. **Avg processing time và histogram
   tính mọi claim có processed_date**; cách này bám trực tiếp schema và tránh việc filter
   IN_REVIEW tạo KPI rỗng dù dữ liệu có ngày xử lý.
4. **"Top 10 diagnoses by total cost"** — cost là submitted hay approved?
   → Chốt: **approved_amount** (chi phí thực insurer chi trả). Frequency chart bên cạnh
   đã phản ánh khối lượng; cost chart phản ánh tiền thực.
5. **"Average claim amount"** → trung bình **submitted_amount** trên toàn bộ claims đã
   filter (không phụ thuộc status — đo "độ lớn claim gửi vào").
6. **Date range filter áp lên cột nào?** → **submitted_date** (trục thời gian chính của
   nghiệp vụ; line chart cũng group theo submitted_date).
7. **Group by week** → ISO week (Thứ 2 đầu tuần), label `2024-W05`; tuần vắt qua biên
   tháng/năm phải rơi vào đúng ISO year — đây là chỗ dễ sai nhất, có unit test riêng.
8. **submitted_date cuối tháng 12 + 30 ngày xử lý** → processed_date được phép tràn sang
   tháng 1/2025 (đề chỉ ràng buộc submitted_date trong 2024).
9. **Click drill-down trên chart nào?** Đề nói "a diagnosis bar" → áp dụng cho **cả 2**
   bar chart diagnosis (frequency & cost), highlight bar đang chọn, click lại hoặc nút
   "✕ Clear" để bỏ. Drill-down **không** làm thay đổi KPI/chart khác (nó là filter riêng
   của table — đề nói "show claims in a table below", không nói re-filter dashboard).
10. **Export CSV** xuất tập đang hiển thị trong table = global filters **+ drill-down
    (nếu đang active) + thứ tự sort hiện tại**, đầy đủ 13 cột gốc.

### 1.4. Thiết kế dataset generator

Generator là script TS riêng (`scripts/generate-data.ts`, chạy bằng `tsx`), **seeded
PRNG** (mulberry32) → chạy lại ra đúng cùng dataset; output `public/data/claims.csv`
commit vào repo (yêu cầu Submission).

Phân phối cụ thể (sẽ được unit test thống kê):

- **claim_type**: OUTPATIENT 60% · DENTAL 18% · INPATIENT 14% · MATERNITY 8%.
- **status**: 77% claims đã quyết định, PENDING ~11%, IN_REVIEW ~12%; approval base theo
  insurer 75/80/85% → toàn dataset thực tế APPROVED ~62%, REJECTED ~15%.
- **submitted_amount**: log-normal, tham số **theo claim_type** (outpatient median ~3k,
  dental ~5k, maternity ~60k, inpatient ~80k), clamp [500, 2,000,000] → "most small,
  few large" và inpatient đắt hơn outpatient (realistic).
- **processing time**: `1 + round(Gamma(k≈2, θ≈3))` clamp [1, 30] → mean ~7, lệch phải;
  KPI/histogram dùng mọi dòng có processed_date.
- **diagnosis_icd10**: 20 mã ICD-10 phổ biến thật (J06.9, E11.9, I10, K21.0, A09,
  M54.5, J45.909, N39.0, K02.9 cho dental, O80 cho maternity…) — **gắn theo claim_type**
  (dental chỉ nhận mã K0x, maternity nhận O8x) với trọng số không đều → top-10 chart có
  hình dạng, không phẳng.
- **submitted_date**: trải 12 tháng 2024, có seasonality nhẹ (đỉnh nhẹ Q1/Q4) để line
  chart không phẳng; **member_name**: tổ hợp first×last name phù hợp 3 nước
  (Thái/Việt/HK); **insurer** 3 tên, **assessor** 5 tên, phân bố không đều nhẹ; mỗi
  insurer có approval rate base khác nhau (~75/80/85% trên claims đã quyết định) để grouped bar chart có ý nghĩa.
- **policy_id**: ~2,500 policy distinct (1 policy có thể có nhiều claims — realistic).

### 1.5. Các quyết định thiết kế chính

- **Chart library: Recharts** — declarative React, có sẵn tooltip/legend/responsive
  container/onClick per-bar; đủ cho cả 6 chart kể cả histogram (BarChart với bins tự
  tính) và horizontal bar (`layout="vertical"`). Không chọn Chart.js (imperative, khó
  drill-down sạch trong React) hay D3 thuần (over-engineering cho 3–5h).
- **CSV parse + export: PapaParse** — member_name/diagnosis có thể chứa ký tự cần
  escape; tự viết parser là chỗ mất điểm vô ích. Export dùng `Papa.unparse` + Blob
  download.
- **Kiến trúc dữ liệu một chiều, selector thuần** (kế thừa nguyên tắc ch-06/07):

  ```
  claims (5,000, parse 1 lần)
      → applyFilters(claims, filters)            ← 1 hàm duy nhất, useMemo
          → computeKpis(filtered)
          → groupByStatus(filtered)
          → claimsOverTime(filtered, 'week'|'month')
          → topDiagnosesByFrequency / ByCost(filtered, 10)
          → processingTimeHistogram(filtered, binSize)
          → approvalRateByInsurer(filtered)
          → applyDrilldown + sort + paginate     ← riêng cho table
  ```

  Tất cả nằm trong `src/lib/` — **pure TypeScript, không import React** → unit test
  không cần render. "Filters apply to all simultaneously" là **hệ quả của kiến trúc**
  (mọi thứ derive từ 1 `filtered`), không phải feature phải vá từng chart.
- **Filter state**: 1 object `{dateRange, claimTypes[], insurers[], countries[], statuses[]}`
  + `useReducer`; multi-select cho enum, empty = "tất cả". Drill-down (`selectedDiagnosis`)
  là state riêng, chỉ table tiêu thụ (quy ước §1.3-9). Có nút **Reset all filters** +
  dòng "Showing X of 5,000 claims" để người chấm thấy filter đang hoạt động.
- **Histogram**: bin cố định 3 ngày (1–3, 4–6, …, 28–30) trên claims có processed_date —
  10 bins, đọc được trên tablet.
- **Performance < 3s**: static build + CSV ~600KB (gzip ~150KB) fetch song song với JS;
  parse 5,000 dòng ~50ms; toàn bộ aggregation < 10ms → thừa đầu bài. Memo từng selector
  để tránh tính lại khi chỉ đổi page của table.
- **Responsive**: CSS Grid — desktop (≥1024px): KPI 5 cột, charts 2 cột; tablet
  (768–1023px): KPI 2–3 cột, charts 1 cột; `ResponsiveContainer` của Recharts lo phần
  trong chart. Mobile không bị chấm nhưng không được vỡ layout.
- **Table**: sort 1 cột (toggle asc/desc, mặc định submitted_date desc), page size 20,
  hiển thị các cột chính + amount format theo locale. 5,000 dòng → không cần virtual
  scroll (chỉ render 20 dòng/trang).

---

## 2. Kiến trúc

```
answers/challenge-09/
├── scripts/
│   └── generate-data.ts            # seeded generator → public/data/claims.csv
├── public/data/claims.csv          # dataset 5,000 dòng (COMMIT vào repo — yêu cầu đề)
├── src/
│   ├── lib/                        ← PURE TypeScript, KHÔNG import React
│   │   ├── types.ts                # Claim, Filters, các enum
│   │   ├── parseCsv.ts             # PapaParse wrapper + validate/coerce kiểu từng dòng
│   │   ├── filters.ts              # applyFilters(claims, filters) — single source of truth
│   │   ├── kpis.ts                 # 5 KPI (quy ước §1.3)
│   │   ├── aggregations.ts         # groupByStatus, claimsOverTime (ISO week/month),
│   │   │                           #   topDiagnoses ×2, histogram, approvalByInsurer
│   │   ├── tableOps.ts             # drilldown, sort, paginate
│   │   └── exportCsv.ts            # Papa.unparse + escaping
│   ├── lib/__tests__/              # Vitest — toàn bộ logic test ở đây
│   ├── state/
│   │   └── filtersReducer.ts       # set/clear filter, reset, selectDiagnosis
│   ├── components/
│   │   ├── Dashboard.tsx           # load CSV, own state, gọi selectors, layout grid
│   │   ├── FilterBar.tsx           # date range + 4 multi-select + reset + count
│   │   ├── KpiCards.tsx
│   │   ├── charts/                 # StatusDonut, ClaimsOverTime (toggle wk/mo),
│   │   │                           #   DiagnosisFrequencyBar, DiagnosisCostBar (click),
│   │   │                           #   ProcessingHistogram, ApprovalByInsurer
│   │   └── ClaimsTable.tsx         # sort + paginate + export + drill-down banner
│   └── App.tsx
├── scripts/__tests__/              # test thống kê cho generator
├── AI_Challenge_09.md              # đề (copy)
├── PLAN.md                         # file này
└── README.md                       # quy ước §1.3, cách chạy/regenerate data, live URL
```

---

## 3. Chiến lược test — test-first phần nào?

Nguyên tắc như ch-07: **test-first cho `lib/` + generator (nơi đề chấm "calculations
correct"), verify bằng preview cho UI/chart**. Chart render sai thì nhìn thấy ngay;
KPI sai 2% thì không — nên tiền test dồn vào số liệu.

### Unit tests (Vitest, trên fixture nhỏ tự dựng ~20 claims biết trước đáp án)

1. **KPI**: từng KPI đúng trên fixture; approval rate bỏ PENDING/IN_REVIEW khỏi mẫu số;
   avg processing time tính mọi claim có processed_date; tập rỗng (filter quá tay) → không
   NaN/chia 0, hiển thị "—".
2. **applyFilters**: từng chiều một + tổ hợp nhiều chiều (AND); biên date range
   (inclusive 2 đầu); empty selection = không lọc.
3. **claimsOverTime**: ISO week đúng ở biên năm (30/12/2024 → 2025-W01) và biên tháng;
   tháng không có claim sau filter vẫn xuất hiện với 0 (line không "nhảy cóc" trục).
4. **topDiagnoses**: đúng sort + cắt 10; by-cost dùng approved_amount; tie-break ổn định.
5. **histogram**: claim 1 ngày vào bin đầu, 30 ngày vào bin cuối, biên 3/4 ngày đúng bin;
   PENDING bị loại.
6. **approvalRateByInsurer**: đúng mẫu số per-insurer; insurer chỉ có pending → loại khỏi chart.
7. **tableOps**: sort từng kiểu cột (string/number/date, null processed_date xuống cuối);
   paginate trang cuối lẻ; drill-down áp sau global filter.
8. **exportCsv**: tên có dấu phẩy/quote được escape đúng; đủ 13 cột; số dòng = tập đã filter.
9. **Generator (test thống kê, chạy trên chính dataset sinh ra)**: đủ 5,000 dòng;
   claim_id/policy_id đúng format; rejection rate toàn dataset trong 13–17%; mean processing time
   6–8 ngày; amounts trong [500, 2tr] và median < mean (skew); REJECTED → approved = 0;
   APPROVED → 0 < approved ≤ submitted; PENDING → processed_date null; processed −
   submitted ∈ [1, 30]; submitted_date phủ đủ 12 tháng 2024; đúng 20 mã ICD-10,
   3 insurer, 5 assessor, 3 nước; **seed cố định → chạy 2 lần ra file giống hệt**.

### Checklist verify UI bằng preview (không viết UI test)

- Đổi từng filter → KPI + cả 6 chart + table + dòng "Showing X" thay đổi **đồng thời**;
  Reset trả về đủ 5,000.
- Click bar diagnosis (cả 2 chart) → table lọc đúng, banner hiện diagnosis + nút clear;
  click bar khác → đổi; clear → về full.
- Tooltip hover đủ 6 chart hiển thị giá trị chính xác; legend/axis label đầy đủ.
- Toggle week/month trên line chart; sort + paginate table; export mở bằng Excel không vỡ.
- Resize 768px và 1024px: không tràn ngang, chart co theo; Lighthouse load < 3s.
- Đối chiếu chéo 1 lần: filter `insurer=X, status=APPROVED` → tổng dòng table = count
  trên donut = số liệu KPI (3 nguồn cùng 1 con số).

---

## 4. Các bước triển khai & timeline ước tính

| # | Bước | Sản phẩm | Ước tính |
|---|---|---|---|
| 1 | Scaffold Vite + React + TS (port 5109) + Recharts + PapaParse; types + danh sách 20 ICD-10/insurers/assessors/names | repo chạy được | 20′ |
| 2 | **Test-first generator**: viết test thống kê §3-9 → viết `generate-data.ts` → sinh `claims.csv`, review mắt thường 30 dòng | dataset commit được | 45′ |
| 3 | **Test-first `lib/`**: fixture + tests 1–8 → implement filters/kpis/aggregations/tableOps/exportCsv | lib xanh test | 60–75′ |
| 4 | Dashboard shell: load CSV, FilterBar, KpiCards, layout grid responsive | KPI sống theo filter | 45′ |
| 5 | 6 charts Recharts + tooltip/legend + toggle week/month + click drill-down | charts hoàn chỉnh | 60′ |
| 6 | ClaimsTable: sort, paginate, drill-down banner, export CSV | table hoàn chỉnh | 30′ |
| 7 | Responsive pass (768/1024/1280) + chạy checklist preview §3 + đối chiếu chéo số liệu | UI polish | 30′ |
| 8 | README (quy ước §1.3, regenerate data, test results), build, **push GitHub + deploy Vercel** | live URL + repo | 30′ |

**Tổng: ~4.5–5.5h** — khớp khung "Intermediate · 3–5 hours" của đề (phần dôi là test
thống kê generator, đáng tiền vì đề chấm "realistic distributions").

### Thứ tự quan trọng

- **Generator (bước 2) trước UI**: mọi thứ phía sau đọc từ CSV này; đổi schema giữa
  chừng là đập lại fixture + selectors. Test thống kê là "hợp đồng" để AI tool không
  sinh data phẳng/giả (uniform amount, status chia đều…) — lỗi rất phổ biến khi để AI
  tự generate.
- **`lib/` (bước 3) trước charts**: chart chỉ là render của selector; khi số đã đúng
  bằng test thì debug chart chỉ còn là chuyện hiển thị.
- **Deploy sớm**: đẩy skeleton lên Vercel ngay sau bước 4 để chắc pipeline + CSV fetch
  trên hosting chạy (path `public/` khi build), cuối chỉ push lại.
