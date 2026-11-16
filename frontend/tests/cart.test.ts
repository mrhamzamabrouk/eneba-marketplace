import { describe, it, expect } from 'vitest';
import { addLine, readCart, checkoutReference, type CartLine } from '../src/cart';
import type { Offer, Product } from '../src/api';
const offer: Offer = {
  id: 11,
  seller: 'Pixel Harbor',
  rating: 4.9,
  platform: 'Steam',
  region: 'Global',
  price_cents: 799,
  stock: 12,
};
const product: Product = {
  id: 1,
  slug: 'elden-ring',
  title: 'Elden Ring',
  description: 'demo',
  image: '/covers/1.svg',
  genre: 'RPG',
  popularity: 10,
  discount: 0,
  price_cents: 799,
  offers: [offer],
};
describe('cart with business consequences', () => {
  it('preserves seller/offer identity and quantity separately', () => {
    let cart = addLine([], product, offer);
    cart = addLine(cart, product, { ...offer, id: 12, seller: 'Nova Keys', price_cents: 1029 });
    cart = addLine(cart, product, offer);
    expect(cart.map((x) => [x.offer_id, x.seller, x.quantity, x.expected_price_cents])).toEqual([
      [11, 'Pixel Harbor', 2, 799],
      [12, 'Nova Keys', 1, 1029],
    ]);
  });
  it('restores a guest cart but rejects corrupt values and duplicate offers', () => {
    const cart = addLine([], product, offer);
    expect(readCart(JSON.stringify(cart))).toEqual(cart);
    expect(readCart('broken')).toEqual([]);
    expect(readCart(JSON.stringify([{ ...cart[0], quantity: 0 }]))).toEqual([]);
    expect(readCart(JSON.stringify([cart[0], cart[0]]))).toHaveLength(1);
    expect(readCart(JSON.stringify([{ ...cart[0], image: 'https://evil.invalid/image' }]))).toEqual(
      [],
    );
  });
  it('bounds quantity and stock', () => {
    let cart: CartLine[] = [];
    for (let i = 0; i < 8; i++) cart = addLine(cart, product, offer);
    expect(cart[0].quantity).toBe(5);
    expect(addLine([], product, { ...offer, stock: 0 })).toEqual([]);
  });
  it('reuses an idempotency reference after reload and changes it for different payment/cart contents', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) || null,
      setItem: (k: string, v: string) => {
        data.set(k, v);
      },
    };
    const cart = addLine([], product, offer);
    const key = checkoutReference(cart, 'success', storage);
    expect(checkoutReference([...cart], 'success', storage)).toBe(key);
    expect(checkoutReference(cart, 'failure', storage)).not.toBe(key);
    const next = checkoutReference(cart, 'success', storage);
    expect(
      checkoutReference([{ ...cart[0], expected_price_cents: 899 }], 'success', storage),
    ).not.toBe(next);
  });
});
