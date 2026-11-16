# Five-minute demonstration

Use the local production build until a public deployment is verified. Open a clean browser, use an example.com demo account and keep the Network panel available. All keys are fake.

**0:00–0:40 — Discover.** Show the unofficial demo notice, banner, best sellers and deals. Explain that the three sections fetch separate Go endpoints and that PostgreSQL holds their content. Best sellers use seeded demo popularity, not real sales.

**0:40–1:25 — Search and filter.** Type `Eldn Ring` in the shared header, show suggestions and press Enter. Try `cyber` to demonstrate partial matching. Apply Steam, Europe, maximum price and sorting. Refresh: URL parameters retain the selections. Displayed prices use eligible in-stock offers only.

**1:25–2:05 — Compare.** Open Elden Ring. Point out three seller offers, ratings, stock, platforms and regions. Choose Nova Keys to show the actual seller/offer identity survives into the cart. Refresh the guest cart to show persistence.

**2:05–3:15 — Sign in and buy.** Continue to checkout as a guest, then register. The cart remains. First choose declined payment: no order or keys are created. Then choose success: the order appears with fake digital keys. No card details or real money are involved.

**3:15–3:55 — Ownership and persistence.** Refresh the order and open the library. Sign out and revisit a protected page. Explain the automated second-account 404 test and the database restart check; demonstrate only results actually verified in TEST_RESULTS.md.

**3:55–5:00 — Explain one transaction.** Open `backend/internal/app/checkout.go`. Point to normalized inputs, the per-user idempotency row, sorted offer locks, price/stock checks and one transaction commit. Show the real contention tests. Explain the scope choices, CI, deployment status and honest AI-history gap.

If asked about readiness: local verification and public delivery are separate. Do not imply GitHub, public deployment or a complete earlier transcript exists until verified. Before submission attach Hamza Mabrouk's accurate English CV and full name; do not send the application automatically.
