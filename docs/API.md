# Endpoint and schema overview

All endpoints are REST JSON on the same origin. Mutations require `Content-Type: application/json` and an `Origin` exactly matching `APP_ORIGIN`. Authenticated routes use the HttpOnly `session` cookie. Errors contain `error`; changed prices also contain `code: PRICE_CHANGED` and `prices`. Limits: 16 KiB JSON, 80-byte search, 1–48 products/page, 20 distinct cart offers, 1–5 units/offer and 50 units/order.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/health` | Process health |
| `GET /api/ready` | Database readiness |
| `GET /api/home/banner` | Database banner content |
| `GET /api/home/best-sellers` | Six available products by seeded popularity |
| `GET /api/home/deals` | Six flagged deals by eligible price |
| `GET /api/products` | `q`, `platform`, `region`, `min`, `max` (cents), `sort`, `page`, `page_size` |
| `GET /api/search?q=...` | Up to six ranked suggestions |
| `GET /api/products/{slug}` | Product and all seller offers, with available stock |
| `POST /api/auth/register` | `{email,password}`; create account and cookie session |
| `POST /api/auth/login` | `{email,password}`; rotate session |
| `POST /api/auth/logout` | Revoke current cookie session |
| `GET /api/auth/me` | Current user, or 401 |
| `POST /api/checkout` | Protected; requires `Idempotency-Key` of 16–128 characters |
| `GET /api/orders` | Protected; owner's latest 100 summaries |
| `GET /api/orders/{id}` | Protected; owner-only item snapshots and fake keys; otherwise 404 |

Checkout body:

```json
{"items":[{"offer_id":11,"quantity":1,"expected_price_cents":799}],"payment":"success"}
```

`payment` is `success` or `failure`. The expected price is a reconfirmation guard; the server obtains the actual price from PostgreSQL. Reuse the same idempotency key with the same request to retry an uncertain response. Changing contents requires a new key, including after a failed payment or a price mismatch. The first fingerprint is retained separately; failed purchase transactions create no order and allocate no keys.

Schema relationships:

- `users` → `sessions`: only bcrypt password hashes and SHA-256 opaque session-token hashes are stored.
- `products` → `offers` ← `sellers`: platform, region and price belong to a particular seller offer.
- `offers` → `key_inventory`: unique `DEMO-...` keys; `sold_order` is null until purchased.
- `homepage_content`: independently editable banner text/link.
- `users` → `orders` → `order_items`: immutable title/seller/platform/region/price/currency snapshots; each inventory ID is unique across order items.
- `checkout_idempotency`: `(user_id, token)` primary key binds a normalized request fingerprint to its committed order.

Checkout locks the idempotency row, then offer rows in ascending ID order, then available inventory rows. Price/stock validation precedes writes. Order, key assignment, item snapshots and idempotency result commit together. Other checkouts of those offers wait, then observe updated stock. Unique constraints provide a second defense against duplicate key delivery.
