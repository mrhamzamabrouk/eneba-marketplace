import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Globe,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { api, money, type Catalog, type Product, type Banner } from './api';
import { useCart } from './state';
import { ErrorBox, Loading, Empty, Card } from './components';

function ProductBlock({ kind, title, kicker }: { kind: string; title: string; kicker: string }) {
  const q = useQuery({
    queryKey: ['home', kind],
    queryFn: ({ signal }) => api<Catalog>('/home/' + kind, { signal }),
  });
  return (
    <section className="home-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{kicker}</p>
          <h2>{title}</h2>
        </div>
        <Link to={'/store?sort=' + (kind === 'best-sellers' ? 'popular' : 'price_asc')}>
          View all <ArrowRight size={17} />
        </Link>
      </div>
      {q.isPending ? (
        <Loading cards />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : q.data.items.length ? (
        <div className="product-grid">
          {q.data.items.map((p) => (
            <Card key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <Empty title="More games are on the way" />
      )}
    </section>
  );
}
export function Home() {
  const q = useQuery({
    queryKey: ['home', 'banner'],
    queryFn: ({ signal }) => api<Banner>('/home/banner', { signal }),
  });
  return (
    <>
      <section className="hero shell">
        {q.isPending ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox error={q.error} retry={() => q.refetch()} />
        ) : (
          <>
            <div className="hero-copy">
              <p className="eyebrow">
                <Sparkles size={15} />
                {q.data.eyebrow}
              </p>
              <h1>{q.data.title}</h1>
              <p>{q.data.subtitle}</p>
              <Link className="button yellow" to={q.data.href}>
                {q.data.cta}
                <ArrowRight size={18} />
              </Link>
              <div className="hero-footnote">
                <Check size={15} /> Compare sellers. Find your next world.
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit one" />
              <div className="orbit two" />
              <div className="planet" />
              <div className="art-cross">✦</div>
              <div className="art-label">
                PRESS
                <br />
                <b>PLAY.</b>
              </div>
              <div className="art-chip">
                <Gamepad2 size={26} /> MORE WORLDS.
                <br />
                MORE POSSIBILITIES.
              </div>
              <div className="spark s1">✦</div>
              <div className="spark s2">✧</div>
            </div>
          </>
        )}
      </section>
      <div className="shell">
        <div className="benefits">
          <span>
            <Zap />
            Instant demo key delivery
          </span>
          <span>
            <ShieldCheck />
            Compare trusted demo sellers
          </span>
          <span>
            <Gamepad2 />
            Games for every kind of player
          </span>
          <span>
            <Globe />
            Global & European offers
          </span>
        </div>
        <ProductBlock
          kind="best-sellers"
          title="The games everyone’s playing"
          kicker="FIND YOUR NEXT FAVORITE"
        />
        <div className="discovery">
          <div>
            <p className="eyebrow">A LITTLE LESS SCROLLING. A LOT MORE PLAYING.</p>
            <h2>Your kind of game is out there.</h2>
            <p>Big adventures, indie gems, and everything in between.</p>
          </div>
          <Link to="/store" className="button outline">
            Find your game <ArrowRight size={18} />
          </Link>
        </div>
        <ProductBlock
          kind="deals"
          title="Small prices. Big adventures."
          kicker="GOOD GAMES, GREAT FINDS"
        />
      </div>
    </>
  );
}
export function Store() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const q = useQuery({
    queryKey: ['catalog', query],
    queryFn: ({ signal }) => api<Catalog>('/products?' + query, { signal }),
  });
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') next.delete('page');
    setParams(next);
  }
  return (
    <div className="shell page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <ChevronRight size={13} /> Store
      </div>
      <div className="store-title">
        <div>
          <p className="eyebrow">FIND YOUR NEXT WORLD</p>
          <h1>{params.get('q') ? 'Results for “' + params.get('q') + '”' : 'Explore all games'}</h1>
          <p className="muted">Compare demo offers and discover something worth playing.</p>
        </div>
        <Gamepad2 size={55} />
      </div>
      <div className="store-layout">
        <aside className="filters">
          <h2>Filters</h2>
          <label>
            Platform
            <select
              value={params.get('platform') || ''}
              onChange={(e) => update('platform', e.target.value)}
            >
              <option value="">All platforms</option>
              <option>Steam</option>
              <option>Xbox</option>
            </select>
          </label>
          <label>
            Region
            <select
              value={params.get('region') || ''}
              onChange={(e) => update('region', e.target.value)}
            >
              <option value="">All regions</option>
              <option>Global</option>
              <option>Europe</option>
            </select>
          </label>
          <fieldset>
            <legend>Price range (EUR)</legend>
            <div className="price-range">
              <label>
                <span>Min</span>
                <input
                  aria-label="Minimum price in EUR"
                  type="number"
                  min="0"
                  step="1"
                  value={params.has('min') ? Number(params.get('min')) / 100 : ''}
                  onChange={(e) =>
                    update(
                      'min',
                      e.target.value ? String(Math.round(Number(e.target.value) * 100)) : '',
                    )
                  }
                />
              </label>
              <span>—</span>
              <label>
                <span>Max</span>
                <input
                  aria-label="Maximum price in EUR"
                  type="number"
                  min="0"
                  step="1"
                  value={params.has('max') ? Number(params.get('max')) / 100 : ''}
                  onChange={(e) =>
                    update(
                      'max',
                      e.target.value ? String(Math.round(Number(e.target.value) * 100)) : '',
                    )
                  }
                />
              </label>
            </div>
          </fieldset>
          <button className="text-button" onClick={() => setParams({})}>
            Clear all filters
          </button>
          <p className="filter-help">
            <ShieldCheck size={18} /> Prices and filters use available offers that match your
            selections.
          </p>
        </aside>
        <section className="store-results" aria-label="Store results">
          <div className="results-toolbar">
            <p aria-live="polite">{q.data ? `${q.data.total} games found` : 'Finding games…'}</p>
            <label>
              Sort by
              <select
                value={params.get('sort') || 'relevance'}
                onChange={(e) => update('sort', e.target.value)}
              >
                <option value="relevance">Recommended</option>
                <option value="popular">Most popular</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="title">Name: A to Z</option>
              </select>
            </label>
          </div>
          {q.isPending ? (
            <Loading cards />
          ) : q.error ? (
            <ErrorBox error={q.error} retry={() => q.refetch()} />
          ) : q.data.items.length ? (
            <>
              <div className="product-grid store-grid">
                {q.data.items.map((p) => (
                  <Card key={p.id} product={p} />
                ))}
              </div>
              <div className="pagination">
                <button
                  className="small"
                  disabled={q.data.page <= 1}
                  onClick={() => update('page', String(q.data.page - 1))}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span>
                  Page {q.data.page} of {Math.max(1, Math.ceil(q.data.total / q.data.page_size))}
                </span>
                <button
                  className="small"
                  disabled={q.data.page * q.data.page_size >= q.data.total}
                  onClick={() => update('page', String(q.data.page + 1))}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <Empty title="No games found">
              <p>Try another name, widen your price range, or clear the filters.</p>
              <button className="button outline" onClick={() => setParams({})}>
                Reset filters
              </button>
            </Empty>
          )}
        </section>
      </div>
    </div>
  );
}
export function ProductPage() {
  const slug = useLocation().pathname.split('/').pop();
  const q = useQuery({
    queryKey: ['product', slug],
    queryFn: ({ signal }) => api<Product>('/products/' + slug, { signal }),
  });
  const cart = useCart();
  if (q.isPending)
    return (
      <div className="shell page">
        <Loading />
      </div>
    );
  if (q.error)
    return (
      <div className="shell page">
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      </div>
    );
  const p = q.data;
  return (
    <div className="shell page">
      <div className="breadcrumbs">
        <Link to="/store">Store</Link>
        <ChevronRight size={13} />
        {p.title}
      </div>
      <div className="product-detail">
        <img className="detail-cover" src={p.image} alt={`Original demo artwork for ${p.title}`} />
        <div>
          <p className="eyebrow">{p.genre.toUpperCase()} · DIGITAL DEMO</p>
          <h1>{p.title}</h1>
          <p className="description">{p.description}</p>
          <div className="tags">
            <span>
              <Globe size={15} /> {[...new Set(p.offers.map((o) => o.region))].join(' / ')}
            </span>
            <span>
              <Gamepad2 size={15} /> {[...new Set(p.offers.map((o) => o.platform))].join(' / ')}
            </span>
            <span>
              <Zap size={15} /> Instant fake key
            </span>
          </div>
          <div className="starting">
            <span>Available from</span>
            <strong>{p.price_cents ? money(p.price_cents) : 'Sold out'}</strong>
            <p>Choose a seller and platform below.</p>
          </div>
          <div className="demo-note">
            <ShieldCheck size={21} /> This is a simulated marketplace. These keys cannot activate
            games.
          </div>
        </div>
      </div>
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR GAME. YOUR CHOICE.</p>
          <h2>Compare seller offers</h2>
        </div>
        <span className="muted">{p.offers.length} offers</span>
      </div>
      <div className="offers">
        {p.offers.map((o, i) => (
          <article className="offer" key={o.id}>
            <div className="seller">
              <span className="seller-avatar">{o.seller.slice(0, 1)}</span>
              <div>
                <strong>{o.seller}</strong>
                <span>
                  <Star size={13} fill="currentColor" /> {o.rating.toFixed(2)} / 5 · Demo rating
                </span>
              </div>
            </div>
            <div className="offer-meta">
              <span>
                <Gamepad2 size={15} />
                {o.platform}
              </span>
              <span>
                <Globe size={15} />
                {o.region}
              </span>
              <small>{o.stock} keys available</small>
            </div>
            <div className="offer-price">
              {i === 0 && o.stock > 0 && <small>LOWEST LISTED PRICE</small>}
              <strong>{money(o.price_cents)}</strong>
            </div>
            <button
              className="button yellow"
              disabled={
                !o.stock ||
                (cart.lines.find((x) => x.offer_id === o.id)?.quantity || 0) >= Math.min(5, o.stock)
              }
              onClick={() => cart.add(p, o)}
              aria-label={'Add ' + o.seller + ' offer to cart'}
            >
              <ShoppingCart size={18} />
              {o.stock ? 'Add to cart' : 'Sold out'}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
