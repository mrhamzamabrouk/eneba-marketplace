import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  ChevronRight,
  Gamepad2,
  Globe,
  LogOut,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  Zap,
} from 'lucide-react';
import { api, post, money, type Catalog, type Product } from './api';
import { useCart, useMe } from './state';

export function ErrorBox({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <p>{error.message}</p>
      {retry && (
        <button className="small" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Loading({ cards = false }: { cards?: boolean }) {
  return cards ? (
    <div className="product-grid" aria-label="Loading products" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  ) : (
    <p className="loading" role="status">
      Loading…
    </p>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Gamepad2 size={40} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}
function SearchBar() {
  const [q, setQ] = useState(''),
    [debounced, setDebounced] = useState(''),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    setOpen(false);
    setActive(-1);
  }, [location.pathname, location.search]);
  const query = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: ({ signal }) => api<Catalog>('/search?q=' + encodeURIComponent(debounced), { signal }),
    enabled: !!debounced,
  });
  const items = debounced === q.trim() ? query.data?.items || [] : [];
  function submit(e: FormEvent) {
    e.preventDefault();
    setOpen(false);
    navigate(
      active >= 0 && items[active]
        ? '/product/' + items[active].slug
        : '/store' + (q.trim() ? '?q=' + encodeURIComponent(q.trim()) : ''),
    );
  }
  return (
    <form
      className="search"
      role="search"
      onSubmit={submit}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Search size={21} />
      <input
        aria-label="Search games"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && !!q.trim()}
        aria-controls="search-suggestions"
        aria-activedescendant={active >= 0 ? 'suggestion-' + active : undefined}
        placeholder="Search for games, adventures, and more"
        value={q}
        maxLength={80}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            setActive(-1);
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, items.length - 1));
            setOpen(true);
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(-1, i - 1));
          }
        }}
      />
      <button aria-label="Submit search" className="search-go">
        <ArrowRight size={19} />
      </button>
      {open && q.trim() && (
        <div className="suggestions">
          <ul id="search-suggestions" role="listbox" aria-label="Matching games">
            {items.map((p, i) => (
              <li id={'suggestion-' + i} role="option" aria-selected={i === active} key={p.id}>
                <Link to={'/product/' + p.slug}>
                  <img src={p.image} alt="" />
                  <span>{p.title}</span>
                  <strong>{money(p.price_cents)}</strong>
                </Link>
              </li>
            ))}
          </ul>
          {query.isFetching && <p role="status">Searching…</p>}
          {query.error && <p role="alert">Search unavailable. Press Enter to try the store.</p>}
          {!query.isFetching && !query.error && debounced === q.trim() && !items.length && (
            <p>No matching games. Try a shorter name.</p>
          )}
          <button className="search-all">
            View all results <ArrowRight size={15} />
          </button>
        </div>
      )}
    </form>
  );
}
export function Header() {
  const location = useLocation();
  const navActive = (href: string) =>
    location.pathname + location.search === href ? 'active' : undefined;
  const { data: me } = useMe();
  const cart = useCart();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<Error | null>(null);
  async function logout() {
    try {
      await post('/auth/logout', {});
      qc.clear();
      navigate('/');
    } catch (e) {
      setError(e as Error);
    }
  }
  return (
    <>
      <div className="demo-strip">
        <ShieldCheck size={13} /> UNOFFICIAL ASSIGNMENT DEMO <span>·</span> Simulated purchases.
        Fake keys. No real money.
      </div>
      <header>
        <div className="header-main shell">
          <Link to="/" className="brand" aria-label="Eneba Play home">
            <span className="brand-mark">
              <i />
              <i />
              <i />
            </span>
            eneba<span className="brand-demo">PLAY</span>
          </Link>
          <SearchBar />
          <div className="account-nav">
            <span className="currency">
              <Globe size={16} /> EN · EUR
            </span>
            <Link
              className="icon-link"
              to={me ? '/orders' : '/login'}
              aria-label={me ? 'My orders' : 'Sign in'}
            >
              <UserRound size={22} />
              <span>{me ? 'My library' : 'Sign in'}</span>
            </Link>
            <Link
              className="cart-link icon-link"
              to="/cart"
              aria-label={'Cart, ' + cart.lines.reduce((n, x) => n + x.quantity, 0) + ' items'}
            >
              <ShoppingCart size={23} />
              <span className="cart-count">{cart.lines.reduce((n, x) => n + x.quantity, 0)}</span>
            </Link>
            {me && (
              <button onClick={logout} className="icon-only" aria-label="Sign out">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
        <nav className="shell primary-nav" aria-label="Main navigation">
          <Link to="/" className={navActive('/')}>
            Discover
          </Link>
          <Link to="/store" className={navActive('/store')}>
            All games
          </Link>
          <Link to="/store?platform=Steam" className={navActive('/store?platform=Steam')}>
            PC games
          </Link>
          <Link to="/store?platform=Xbox" className={navActive('/store?platform=Xbox')}>
            Xbox games
          </Link>
          <Link to="/store?sort=price_asc" className={navActive('/store?sort=price_asc')}>
            <Zap size={14} /> Best prices
          </Link>
          <span className="nav-note">
            <ShieldCheck size={14} /> Your next great game awaits
          </span>
        </nav>
      </header>
      {error && <ErrorBox error={error} />}
      <div className="toast" role="status">
        {cart.notice}
      </div>
    </>
  );
}
export function Card({ product: p }: { product: Product }) {
  return (
    <Link to={'/product/' + p.slug} className="product-card">
      <div className="cover">
        <img src={p.image} alt={`Original demo artwork for ${p.title}`} loading="lazy" />
        {p.discount > 0 && <span className="discount">DEAL</span>}
        <span className="cover-platform">
          <Gamepad2 size={12} />
          {[...new Set(p.offers.map((o) => o.platform))].join(' · ')}
        </span>
      </div>
      <div className="card-body">
        <h3>{p.title}</h3>
        <p className="region">{[...new Set(p.offers.map((o) => o.region))].join(' / ')}</p>
        <p className="from">From</p>
        <div className="card-price">
          {money(p.price_cents)}
          <span>
            <ChevronRight size={18} />
          </span>
        </div>
        <p className="seller-count">{p.offers.length} demo seller offers</p>
      </div>
    </Link>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="shell footer-inner">
        <Link to="/" className="brand">
          eneba<span className="brand-demo">PLAY</span>
        </Link>
        <p>
          Built for the love of play.
          <br />
          <span>Unofficial internship assignment · All offers and keys are demo only.</span>
        </p>
        <div>
          <Link to="/store">Explore games</Link>
          <Link to="/orders">Your library</Link>
        </div>
        <span className="footer-year">© 2026 Demo project</span>
      </div>
    </footer>
  );
}
