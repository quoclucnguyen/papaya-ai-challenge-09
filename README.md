# Challenge 09 — Claims Analytics Dashboard

Interactive analytics dashboard cho 5,000 insurance claims (generated dataset).
Stack: **Vite + React 19 + TypeScript + Recharts 3 + PapaParse + Vitest**.

**Live demo:** https://papaya-ai-challenge-09.vercel.app

> Đề bài: [AI_Challenge_09.md](./AI_Challenge_09.md) · Plan chi tiết: [PLAN.md](./PLAN.md) · Checklist nghiệm thu: [CHECKLIST.md](./CHECKLIST.md)

## Chạy local

```bash
npm install
npm run dev        # http://localhost:5109
npm test           # 56 tests = 41 unit tests (lib) + 15 statistical tests (generator)
npm run build      # production build → dist/
```

## Dataset

**Requirement fulfilled:** Include the generated dataset in the repository.

[`public/data/claims.csv`](./public/data/claims.csv) — 5,000 claims, **đã commit vào repo**. Sinh lại bằng:

```bash
npm run generate-data   # node scripts/generate-data.ts — seeded, chạy lại ra đúng cùng file
```

Generator dùng PRNG seeded (mulberry32, seed `20240901`) nên dataset tái lập 100%.
Phân phối được **kiểm bằng test thống kê** (`scripts/__tests__/generator.test.ts`):

- Outpatient chiếm đa số (~60%), log-normal amounts (most small, few large), clamp [500, 2tr]
- Rejection rate trên toàn bộ 5,000 claims ≈ 15%
- Processing time Gamma(k=2) mean ≈ 7 ngày, trong [1, 30]
- Diagnosis gắn theo claim type (dental chỉ nhận mã K0x, maternity O8x…), 20 mã ICD-10 thật
- Mỗi insurer có approval rate base khác nhau (75/80/85% trên claims đã quyết định) → chart by-insurer có ý nghĩa

## Quy ước nghiệp vụ (đề không quy định rõ — đã chốt & hiển thị chú thích ⓘ trên UI)

1. **Approval rate** = `APPROVED / (APPROVED + REJECTED)` — PENDING/IN_REVIEW chưa có kết cục nên không nằm trong mẫu số.
2. **`approved_amount`** chỉ > 0 với claim APPROVED (70–100% submitted, mô phỏng partial approval); REJECTED/PENDING/IN_REVIEW = 0.
3. **`processed_date`** null khi PENDING (theo đề); **avg processing time & histogram tính mọi claim có `processed_date`**, gồm cả IN_REVIEW.
4. **Top diagnoses by total cost** dùng tổng **approved_amount** (chi phí insurer thực chi trả).
5. **Average claim amount** = trung bình **submitted_amount** trên mọi claim đã filter, không phụ thuộc status.
6. **Date range filter** áp lên `submitted_date`, inclusive 2 đầu; line chart cũng group theo `submitted_date` (ISO week / month).
7. **Drill-down** (click bar diagnosis ở cả 2 chart) chỉ lọc **bảng claims** bên dưới, không làm thay đổi KPI/chart khác — đề yêu cầu "show claims in a table below". Click lại bar hoặc nút ✕ Clear để bỏ.
8. **Export CSV** xuất đúng tập đang hiển thị trong table: global filters + drill-down (nếu có) + thứ tự sort hiện tại, đủ 13 cột gốc.

## Kiến trúc

```
scripts/
  generator.ts            # seeded generator (pure) + toCsv
  generate-data.ts        # CLI → public/data/claims.csv
  __tests__/              # 15 statistical tests trên dataset
src/
  lib/                    # PURE TypeScript — không import React
    types.ts              # Claim, Filters, enums, CSV_COLUMNS
    parseCsv.ts           # CSV → Claim[] (validate đúng 13 cột, enum, amount, date và business rules)
    filters.ts            # applyFilters — single source of truth
    kpis.ts               # 5 KPI
    aggregations.ts       # status, over-time (ISO week/month), top diagnoses ×2,
                          #   histogram, approval-by-insurer
    tableOps.ts           # drill-down, sort, paginate
    exportCsv.ts          # export + download
    __tests__/            # 38 unit tests trên fixture biết trước đáp án
  state/filtersReducer.ts # filter state + drill-down state
  components/             # Dashboard, FilterBar, KpiCards, charts/, ClaimsTable
```

Nguyên tắc then chốt: **mọi con số đều derive từ một tập `filtered` duy nhất**
(`applyFilters` → useMemo → các selector). "Filters apply to all visualizations
simultaneously" là hệ quả kiến trúc, không phải feature vá từng chart. Toàn bộ logic
tính toán nằm trong `lib/` thuần — verify bằng unit test, component chỉ render.

## Test results

```
Test Files  6 passed (6)
     Tests  56 passed (56)   # 41 lib + 15 generator
```

Đã verify thủ công qua preview: filters cập nhật đồng thời KPI + 6 charts + table
(đối chiếu chéo 3 nguồn cùng ra 3,096 khi lọc APPROVED); drill-down J06.9 → 567 dòng;
sort/paginate/export; tooltip mọi chart; tablet 768px không tràn ngang. Production build
code-split chart library: entry JS ~75KB gzip, chart chunks tải bất đồng bộ và được cache.

## Deploy

SPA tĩnh — build `dist/` deploy được lên Vercel/Netlify/GitHub Pages không cần config thêm
(CSV nằm trong `public/` nên được copy nguyên vào build).
