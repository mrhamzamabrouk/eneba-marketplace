# Ten questions about this implementation

1. **What happens when I buy one offer?** `Checkout` in `frontend/src/account-pages.tsx` sends offer ID, quantity, expected cents and an idempotency header. `checkout` in `backend/internal/app/checkout.go` authenticates through middleware, locks database rows, reads the real price, allocates fake keys and commits the order. React then fetches the owner-only order page.
2. **Why separate cart state from server state?** The guest cart is local React context persisted without credentials in localStorage (`state.tsx`, `cart.ts`). Products, account and orders come from TanStack Query. The server is authoritative for prices, stock and ownership.
3. **Why integer cents?** Binary floating-point can produce awkward rounding. A two-unit offer at 799 cents totals exactly 1598 cents. `checkout.go` never accepts a browser-provided total.
4. **What is a transaction?** It groups changes so they all commit or all roll back. Payment failure, a changed price or missing stock returns before commit. There is no partial order or partly consumed cart.
5. **How do you stop two buyers getting the last key?** Every checkout locks offer rows in ascending ID order and then key rows. A competing request waits and sees the updated inventory. A unique inventory ID on order items gives a second database constraint. `TestIntegrationLastKeyContention` runs real competing requests.
6. **What if the browser retries after losing the response?** The same user's idempotency key and normalized request fingerprint return the existing order. Eight simultaneous retries are tested. A different request with that key is rejected with 409.
7. **How does typo search work?** `catalog.go` obtains PostgreSQL trigram similarity and ranks exact, prefix and substring matches above fuzzy matches. If the extension is unavailable, edit distance provides a small-catalog fallback. Tests use `Eldn Ring` and `cyber`. Pagination and ranking in Go are an explicit demo scaling tradeoff.
8. **How are passwords and sessions different?** Bcrypt is a deliberately slow password hash in `auth.go`; the 10–72-byte policy respects bcrypt's input limit. Sessions use random 32-byte opaque tokens in HttpOnly cookies, while PostgreSQL stores only their SHA-256 hashes and expiry. Tokens are never stored in localStorage.
9. **How do you protect private keys and prevent CSRF?** Order queries filter by the authenticated user's ID; other owners get 404. Catalog queries select no keys. State-changing requests require the configured exact Origin, alongside SameSite cookies. Logout revokes the session and clears React's cached private data.
10. **What are the main limitations?** It is a small unofficial demo with original abstract covers, seeded popularity and ratings, no real payments/activation/email/recovery/admin, an in-memory single-instance auth throttle, and 100 recent order summaries. Free hosting can sleep. GitHub/public deployment and all AI history must be verified separately before submission.

## One purchase, simply

```mermaid
sequenceDiagram
    participant B as Browser
    participant G as Go API
    participant P as PostgreSQL
    B->>G: offer IDs + quantities + expected cents + retry reference
    G->>P: authenticate hashed cookie session
    G->>P: begin transaction; lock retry reference and offers
    G->>P: check actual prices and available keys
    alt Price changed or stock missing
      G->>P: rollback
      G-->>B: actionable error; reconfirm or revise cart
    else Simulated success
      G->>P: insert order + snapshots; assign unique fake keys
      G->>P: commit
      G-->>B: private order and fake keys
    end
```

Practice explaining an actual function aloud. Avoid claiming tests or public behavior absent from TEST_RESULTS.md. The original requirement explicitly expects you to understand the code and show the full prompts and responses used to build it.
