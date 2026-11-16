export type User = { id: string; email: string };
export type Offer = {
  id: number;
  seller: string;
  rating: number;
  platform: string;
  region: string;
  price_cents: number;
  stock: number;
};
export type Product = {
  id: number;
  slug: string;
  title: string;
  description: string;
  image: string;
  genre: string;
  popularity: number;
  discount: number;
  price_cents: number;
  offers: Offer[];
};
export type Catalog = { items: Product[]; total: number; page: number; page_size: number };
export type Banner = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
};
export type Order = {
  id: string;
  total_cents: number;
  currency: string;
  created_at: string;
  items?: {
    title: string;
    seller: string;
    platform: string;
    region: string;
    unit_cents: number;
    key: string;
    offer_id: number;
  }[];
};
export type PriceChange = { offer_id: number; quantity: number; expected_price_cents: number };
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public prices?: PriceChange[],
  ) {
    super(message);
  }
}
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/api' + url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      data.error || 'Request failed. Please try again.',
      data.code,
      data.prices,
    );
  return data as T;
}
export const money = (cents: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
export const post = <T>(url: string, data: unknown, headers?: HeadersInit) =>
  api<T>(url, { method: 'POST', body: JSON.stringify(data), headers });
