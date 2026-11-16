import type { Product, Offer } from './api';
export type CartLine = {
  offer_id: number;
  quantity: number;
  expected_price_cents: number;
  title: string;
  seller: string;
  platform: string;
  region: string;
  image: string;
  slug: string;
};
export function readCart(raw: string | null): CartLine[] {
  try {
    const data: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(data) || data.length > 20) return [];
    const seen = new Set<number>();
    const lines = data.filter((x): x is CartLine => {
      if (!x || typeof x !== 'object') return false;
      const v = x as Record<string, unknown>;
      if (
        !Number.isSafeInteger(v.offer_id) ||
        Number(v.offer_id) < 1 ||
        seen.has(Number(v.offer_id)) ||
        !Number.isInteger(v.quantity) ||
        Number(v.quantity) < 1 ||
        Number(v.quantity) > 5 ||
        !Number.isInteger(v.expected_price_cents) ||
        Number(v.expected_price_cents) < 1 ||
        Number(v.expected_price_cents) > 1000000
      )
        return false;
      if (
        !['title', 'seller', 'platform', 'region', 'image', 'slug'].every(
          (k) => typeof v[k] === 'string' && String(v[k]).length < 500,
        )
      )
        return false;
      if (!String(v.image).startsWith('/covers/') || !/^[-a-z0-9]+$/.test(String(v.slug)))
        return false;
      seen.add(Number(v.offer_id));
      return true;
    });
    return lines.reduce((n, x) => n + x.quantity, 0) <= 50 ? lines : [];
  } catch {
    return [];
  }
}
export function addLine(lines: CartLine[], p: Product, o: Offer): CartLine[] {
  const existing = lines.find((x) => x.offer_id === o.id);
  if (existing) {
    const quantity = Math.min(5, o.stock, existing.quantity + 1);
    if (quantity <= existing.quantity || lines.reduce((n, x) => n + x.quantity, 0) >= 50)
      return lines;
    return lines.map((x) => (x.offer_id === o.id ? { ...x, quantity } : x));
  }
  if (lines.length >= 20 || o.stock < 1 || lines.reduce((n, x) => n + x.quantity, 0) >= 50)
    return lines;
  return [
    ...lines,
    {
      offer_id: o.id,
      quantity: 1,
      expected_price_cents: o.price_cents,
      title: p.title,
      seller: o.seller,
      platform: o.platform,
      region: o.region,
      image: p.image,
      slug: p.slug,
    },
  ];
}
export function checkoutReference(
  items: CartLine[],
  payment: string,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): string {
  const signature = JSON.stringify({
    items: items
      .map(({ offer_id, quantity, expected_price_cents }) => ({
        offer_id,
        quantity,
        expected_price_cents,
      }))
      .sort((a, b) => a.offer_id - b.offer_id),
    payment,
  });
  let old: { signature: string; key: string } | null = null;
  try {
    old = JSON.parse(storage.getItem('checkout-reference') || 'null');
  } catch {
    /* recover corrupt browser state */
  }
  if (old?.signature === signature && typeof old.key === 'string' && old.key.length >= 16)
    return old.key;
  const key = crypto.randomUUID();
  storage.setItem('checkout-reference', JSON.stringify({ signature, key }));
  return key;
}
