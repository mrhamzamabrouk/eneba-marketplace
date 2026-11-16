import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  KeyRound,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { api, post, ApiError, money, type User, type Order, type PriceChange } from './api';
import { useCart, useMe } from './state';
import { checkoutReference } from './cart';
import { ErrorBox, Loading, Empty } from './components';

export function CartPage() {
  const { lines, setLines } = useCart();
  return (
    <div className="shell page narrow">
      <p className="eyebrow">ONE STEP CLOSER TO PLAY</p>
      <h1>
        Your cart <span className="muted">({lines.reduce((n, x) => n + x.quantity, 0)})</span>
      </h1>
      {!lines.length ? (
        <Empty title="Your next adventure is waiting">
          <p>Find a game and choose your favorite seller to get started.</p>
          <Link to="/store" className="button yellow">
            Explore games <ArrowRight size={18} />
          </Link>
        </Empty>
      ) : (
        <div className="cart-layout">
          <div>
            {lines.map((line) => (
              <article className="cart-row" key={line.offer_id}>
                <img src={line.image} alt="" />
                <div className="cart-info">
                  <Link to={'/product/' + line.slug}>
                    <h2>{line.title}</h2>
                  </Link>
                  <p>
                    {line.platform} · {line.region}
                  </p>
                  <p>Sold by {line.seller}</p>
                  <label className="quantity">
                    Quantity
                    <select
                      aria-label={'Quantity for ' + line.title + ' from ' + line.seller}
                      value={line.quantity}
                      onChange={(e) =>
                        setLines(
                          lines.map((x) =>
                            x.offer_id === line.offer_id
                              ? { ...x, quantity: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="cart-price">
                  <strong>{money(line.expected_price_cents * line.quantity)}</strong>
                  <button
                    className="icon-only"
                    aria-label={'Remove ' + line.title + ' from ' + line.seller}
                    onClick={() => setLines(lines.filter((x) => x.offer_id !== line.offer_id))}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <aside className="summary">
            <h2>Order summary</h2>
            <p>
              <span>Demo subtotal</span>
              <strong>
                {money(lines.reduce((n, x) => n + x.expected_price_cents * x.quantity, 0))}
              </strong>
            </p>
            <p className="muted">Final prices and availability are checked when you pay.</p>
            <Link to="/checkout" className="button yellow">
              Continue to checkout <ArrowRight size={18} />
            </Link>
            <span className="summary-note">
              <ShieldCheck size={15} /> No real payment information needed
            </span>
          </aside>
        </div>
      )}
    </div>
  );
}
export function AuthPage() {
  const location = useLocation();
  const register = location.pathname === '/register';
  const [params] = useSearchParams();
  const next = params.get('next') === '/checkout' ? '/checkout' : '/orders';
  const nav = useNavigate();
  const qc = useQueryClient();
  const me = useMe();
  const [error, setError] = useState<Error | null>(null),
    [pending, setPending] = useState(false);
  if (me.data) return <Navigate to={next} replace />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const user = await post<User>(register ? '/auth/register' : '/auth/login', {
        email: data.get('email'),
        password: data.get('password'),
      });
      qc.setQueryData(['me'], user);
      nav(next, { replace: true });
    } catch (e) {
      setError(e as Error);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="shell auth-page">
      <div className="auth-intro">
        <p className="eyebrow">YOUR ADVENTURES, ALL IN ONE PLACE</p>
        <h1>{register ? 'A new world awaits.' : 'Welcome back, player.'}</h1>
        <p>Keep your games close and your next adventure closer.</p>
        <div className="auth-art">
          <Gamepad2 size={110} />
          <span>LET’S PLAY.</span>
        </div>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <h2>{register ? 'Create your account' : 'Sign in to your account'}</h2>
        <p className="muted">
          {register
            ? 'No payment details. Just possibilities.'
            : 'Your demo keys and orders are waiting.'}
        </p>
        {error && <ErrorBox error={error} />}
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            maxLength={72}
            aria-describedby="password-policy"
          />
        </label>
        <small id="password-policy">
          10–72 UTF-8 bytes. Non-ASCII characters may use several bytes.
        </small>
        <button className="button yellow" disabled={pending}>
          {pending ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
          <ArrowRight size={18} />
        </button>
        <p>
          {register ? 'Already a player?' : 'New here?'}{' '}
          <Link to={(register ? '/login' : '/register') + '?next=' + encodeURIComponent(next)}>
            {register ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
        <div className="demo-note">
          <ShieldCheck size={19} /> Use a demo email and a unique test password. No email is sent.
        </div>
      </form>
    </div>
  );
}
export function Protected({ children }: { children: ReactNode }) {
  const q = useMe();
  const location = useLocation();
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
  return q.data ? (
    <>{children}</>
  ) : (
    <Navigate
      to={
        '/login?next=' +
        encodeURIComponent(location.pathname === '/checkout' ? '/checkout' : '/orders')
      }
      replace
    />
  );
}
export function Checkout() {
  const { lines, setLines } = useCart();
  const [payment, setPayment] = useState('success'),
    [pending, setPending] = useState(false),
    [error, setError] = useState<Error | null>(null),
    [changes, setChanges] = useState<PriceChange[] | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function pay() {
    if (pending || changes) return;
    setPending(true);
    setError(null);
    try {
      const key = checkoutReference(lines, payment, sessionStorage);
      const order = await post<Order>(
        '/checkout',
        {
          items: lines.map(({ offer_id, quantity, expected_price_cents }) => ({
            offer_id,
            quantity,
            expected_price_cents,
          })),
          payment,
        },
        { 'Idempotency-Key': key },
      );
      setLines([]);
      sessionStorage.removeItem('checkout-reference');
      qc.invalidateQueries({ queryKey: ['orders'] });
      navigate('/orders/' + order.id, { replace: true });
    } catch (e) {
      setError(e as Error);
      if (e instanceof ApiError && e.code === 'PRICE_CHANGED') setChanges(e.prices || []);
    } finally {
      setPending(false);
    }
  }
  if (!lines.length)
    return (
      <div className="shell page narrow">
        <Empty title="Your cart is empty">
          <Link to="/store" className="button yellow">
            Find a game
          </Link>
        </Empty>
      </div>
    );
  return (
    <div className="shell page narrow">
      <p className="eyebrow">THE FINAL CHECKPOINT</p>
      <h1>Checkout</h1>
      <div className="cart-layout">
        <section className="checkout-panel">
          <h2>
            <ShieldCheck size={23} /> Simulated payment
          </h2>
          <p>This demo never charges money or asks for card details.</p>
          <fieldset>
            <legend>Choose a payment outcome</legend>
            <label className="radio">
              <input
                type="radio"
                name="payment"
                value="success"
                checked={payment === 'success'}
                onChange={() => setPayment('success')}
              />
              <span>
                <strong>Successful payment</strong>
                <small>Place a demo order and receive fake keys.</small>
              </span>
            </label>
            <label className="radio">
              <input
                type="radio"
                name="payment"
                value="failure"
                checked={payment === 'failure'}
                onChange={() => setPayment('failure')}
              />
              <span>
                <strong>Declined payment</strong>
                <small>Test a failure. Your cart stays and no keys are issued.</small>
              </span>
            </label>
          </fieldset>
          {error && <ErrorBox error={error} />}{' '}
          {changes && (
            <div className="price-changes">
              <h3>Review updated prices</h3>
              {changes.map((c) => (
                <p key={c.offer_id}>
                  {lines.find((x) => x.offer_id === c.offer_id)?.title}:{' '}
                  {money(lines.find((x) => x.offer_id === c.offer_id)?.expected_price_cents || 0)} →{' '}
                  <strong>{money(c.expected_price_cents)}</strong> each
                </p>
              ))}
              <button
                className="button outline"
                onClick={() => {
                  setLines(
                    lines.map((x) => {
                      const c = changes.find((c) => c.offer_id === x.offer_id);
                      return c ? { ...x, expected_price_cents: c.expected_price_cents } : x;
                    }),
                  );
                  setChanges(null);
                  setError(null);
                }}
              >
                Accept updated prices
              </button>
              <p>Then confirm payment again to place your order.</p>
            </div>
          )}
          <Link className="back-link" to="/cart">
            <ChevronLeft size={16} /> Back to cart
          </Link>
        </section>
        <aside className="summary">
          <h2>Your order</h2>
          {lines.map((x) => (
            <p key={x.offer_id}>
              <span>
                {x.quantity} × {x.title}
                <small>
                  {x.seller} · {x.platform} · {x.region}
                </small>
              </span>
              <strong>{money(x.expected_price_cents * x.quantity)}</strong>
            </p>
          ))}
          <p className="total">
            <span>Total (EUR)</span>
            <strong>
              {money(lines.reduce((n, x) => n + x.quantity * x.expected_price_cents, 0))}
            </strong>
          </p>
          <button className="button yellow" onClick={pay} disabled={pending || !!changes}>
            {pending ? 'Processing…' : 'Confirm simulated payment'}
            <ArrowRight size={17} />
          </button>
          <p className="summary-note">
            <KeyRound size={15} /> Fake keys appear in your private order.
          </p>
        </aside>
      </div>
    </div>
  );
}
export function Orders() {
  const q = useQuery({
    queryKey: ['orders'],
    queryFn: ({ signal }) => api<Order[]>('/orders', { signal }),
  });
  return (
    <div className="shell page narrow">
      <p className="eyebrow">ALL YOUR ADVENTURES</p>
      <h1>Your library</h1>
      <p className="muted">Your most recent 100 demo orders. Only you can access your keys.</p>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : !q.data.length ? (
        <Empty title="Your story starts here">
          <p>Your completed demo orders will appear here.</p>
          <Link className="button yellow" to="/store">
            Explore games
          </Link>
        </Empty>
      ) : (
        <div className="order-list">
          {q.data.map((o) => (
            <Link className="order-row" key={o.id} to={'/orders/' + o.id}>
              <span className="order-icon">
                <KeyRound />
              </span>
              <div>
                <strong>Demo order · {o.id.slice(0, 8)}</strong>
                <p>{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <strong>{money(o.total_cents)}</strong>
              <ChevronRight />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
export function OrderPage() {
  const id = useLocation().pathname.split('/').pop();
  const q = useQuery({
    queryKey: ['order', id],
    queryFn: ({ signal }) => api<Order>('/orders/' + id, { signal }),
  });
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <div className="shell page narrow">
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <div className="order-success">
            <span>
              <Check size={30} />
            </span>
            <p className="eyebrow">ADVENTURE UNLOCKED</p>
            <h1>Your demo keys are ready.</h1>
            <p>
              Order {q.data.id.slice(0, 8)} · {money(q.data.total_cents)} · Simulated payment
            </p>
          </div>
          <div className="demo-note">
            <ShieldCheck /> These are fake demo keys. They cannot activate any real product.
          </div>
          <div className="key-list">
            {q.data.items?.map((x, i) => (
              <article className="key-card" key={i}>
                <div>
                  <h2>{x.title}</h2>
                  <p>
                    {x.seller} · {x.platform} · {x.region} · {money(x.unit_cents)}
                  </p>
                </div>
                <div className="key-value">
                  <code>{x.key}</code>
                  <button
                    className="small"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(x.key);
                        setCopied(x.key);
                      } catch {
                        setCopied('Copy unavailable; select the key text manually.');
                      }
                    }}
                  >
                    {copied === x.key ? 'Copied' : 'Copy key'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p role="status">{copied && copied.startsWith('Copy unavailable') ? copied : ''}</p>
          <Link className="button outline" to="/orders">
            View all orders <ArrowRight size={17} />
          </Link>
        </>
      )}
    </div>
  );
}
