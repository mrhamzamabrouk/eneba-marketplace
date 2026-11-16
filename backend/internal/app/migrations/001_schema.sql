-- +goose Up
CREATE TABLE users (id text PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE sessions (token_hash bytea PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE products (id integer PRIMARY KEY, slug text UNIQUE NOT NULL, title text NOT NULL, description text NOT NULL, image text NOT NULL, genre text NOT NULL, popularity integer NOT NULL DEFAULT 0, discount integer NOT NULL DEFAULT 0 CHECK(discount BETWEEN 0 AND 90));
CREATE TABLE sellers (id integer PRIMARY KEY, name text NOT NULL UNIQUE, rating numeric(3,2) NOT NULL CHECK(rating BETWEEN 0 AND 5));
CREATE TABLE offers (id integer PRIMARY KEY, product_id integer NOT NULL REFERENCES products(id), seller_id integer NOT NULL REFERENCES sellers(id), platform text NOT NULL, region text NOT NULL, price_cents integer NOT NULL CHECK(price_cents > 0 AND price_cents <= 1000000), UNIQUE(product_id,seller_id,platform,region));
CREATE INDEX offers_product ON offers(product_id);
CREATE TABLE homepage_content (id integer PRIMARY KEY, eyebrow text NOT NULL, title text NOT NULL, subtitle text NOT NULL, cta text NOT NULL, href text NOT NULL);
CREATE TABLE orders (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), total_cents integer NOT NULL CHECK(total_cents > 0), currency text NOT NULL DEFAULT 'EUR' CHECK(currency = 'EUR'), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX orders_owner ON orders(user_id,created_at DESC);
CREATE TABLE key_inventory (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, offer_id integer NOT NULL REFERENCES offers(id), fake_key text NOT NULL UNIQUE CHECK(fake_key LIKE 'DEMO-%'), sold_order text REFERENCES orders(id));
CREATE INDEX inventory_available ON key_inventory(offer_id,id) WHERE sold_order IS NULL;
CREATE TABLE order_items (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id), inventory_id bigint NOT NULL UNIQUE REFERENCES key_inventory(id), offer_id integer NOT NULL REFERENCES offers(id), title text NOT NULL, seller text NOT NULL, platform text NOT NULL, region text NOT NULL, unit_cents integer NOT NULL CHECK(unit_cents > 0), currency text NOT NULL DEFAULT 'EUR' CHECK(currency='EUR'));
CREATE TABLE checkout_idempotency (user_id text NOT NULL REFERENCES users(id), token text NOT NULL, fingerprint text NOT NULL, order_id text REFERENCES orders(id), PRIMARY KEY(user_id,token));

-- +goose Down
DROP TABLE checkout_idempotency,order_items,key_inventory,orders,homepage_content,offers,sellers,products,sessions,users;
