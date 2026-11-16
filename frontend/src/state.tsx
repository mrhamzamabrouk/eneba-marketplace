import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError, type User, type Product, type Offer } from './api';
import { readCart, addLine, type CartLine } from './cart';
export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api<User>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
  });
type CartState = {
  lines: CartLine[];
  setLines: (lines: CartLine[]) => void;
  add: (p: Product, o: Offer) => void;
  notice: string;
};
const CartContext = createContext<CartState | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      return readCart(localStorage.getItem('eneba-cart'));
    } catch {
      return [];
    }
  });
  const [notice, setNotice] = useState('');
  useEffect(() => {
    try {
      localStorage.setItem('eneba-cart', JSON.stringify(lines));
    } catch {
      setNotice('Browser storage is unavailable. Keep this tab open to retain your cart.');
    }
  }, [lines]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  return (
    <CartContext.Provider
      value={{
        lines,
        setLines,
        notice,
        add: (p, o) => {
          const next = addLine(lines, p, o);
          if (next === lines) {
            setNotice('Cart or stock limit reached. Review your cart before adding more.');
            return;
          }
          setLines(next);
          setNotice(`${p.title} added to your cart.`);
        },
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('Cart provider is missing');
  return value;
}
