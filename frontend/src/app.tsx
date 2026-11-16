import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Header, Footer, Empty } from './components';
import { Home, Store, ProductPage } from './catalog-pages';
import { CartPage, AuthPage, Protected, Checkout, Orders, OrderPage } from './account-pages';
export function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/store" element={<Store />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route
            path="/checkout"
            element={
              <Protected>
                <Checkout />
              </Protected>
            }
          />
          <Route
            path="/orders"
            element={
              <Protected>
                <Orders />
              </Protected>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <Protected>
                <OrderPage />
              </Protected>
            }
          />
          <Route
            path="*"
            element={
              <div className="shell page">
                <Empty title="This page has wandered off">
                  <Link to="/store" className="button yellow">
                    Back to the store
                  </Link>
                </Empty>
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
