import { test, expect, type Page } from '@playwright/test';
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

test('password minimum counts UTF-8 bytes rather than characters', async ({page}) => {
  await page.goto('/register');
  await page.getByLabel('Email address').fill(unique());
  await page.getByLabel('Password', {exact:true}).fill('ééééé');
  await page.getByRole('button', {name:'Create account',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Your library'})).toBeVisible();
});
async function register(page: Page, next = '/orders') {
  await page.goto('/register?next=' + encodeURIComponent(next));
  await page.getByLabel('Email address').fill(unique());
  await page.getByLabel('Password', { exact: true }).fill('demo-password-123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test('complete real purchase, failed payment, guest persistence, logout and ownership', async ({
  page,
  browser,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Great games. Better deals.' })).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(12);
  await noOverflow(page);
  await page.screenshot({ path: `test-results/${info.project.name}-home.png`, fullPage: true });
  const search = page.getByRole('combobox', { name: 'Search games' });
  await search.fill('Eldn Ring');
  await expect(page.getByRole('option', { name: /Elden Ring/ })).toBeVisible();
  await search.press('Enter');
  await expect(page).toHaveURL(/store\?q=Eldn/);
  await expect(page.locator('.product-card').first()).toContainText('Elden Ring');
  await page.getByRole('combobox', { name: 'Platform', exact: true }).selectOption('Steam');
  await page.getByRole('combobox', { name: 'Region', exact: true }).selectOption('Europe');
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('price_desc');
  await page.getByLabel('Maximum price in EUR').fill('40');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Platform', exact: true })).toHaveValue('Steam');
  await expect(page.getByRole('combobox', { name: 'Region', exact: true })).toHaveValue('Europe');
  await noOverflow(page);
  await page.screenshot({ path: `test-results/${info.project.name}-store.png`, fullPage: true });
  await page.locator('.product-card').filter({ hasText: 'Elden Ring' }).first().click();
  await expect(page.locator('.offer')).toHaveCount(3);
  await noOverflow(page);
  await page.screenshot({ path: `test-results/${info.project.name}-product.png`, fullPage: true });
  await page.getByRole('button', { name: 'Add Nova Keys offer to cart' }).click();
  await page.getByRole('link', { name: 'Cart, 1 items' }).click();
  await page.reload();
  await expect(page.locator('.cart-row')).toContainText('Nova Keys');
  await expect(page.locator('.cart-row')).toContainText('Xbox');
  await page.getByRole('link', { name: /Continue to checkout/ }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByRole('link', { name: 'Create an account' }).click();
  await page.getByLabel('Email address').fill(unique());
  await page.getByLabel('Password', { exact: true }).fill('demo-password-123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Checkout', exact: true })).toBeVisible();
  await expect(page.locator('.summary')).toContainText('Nova Keys');
  await noOverflow(page);
  await page.screenshot({ path: `test-results/${info.project.name}-checkout.png`, fullPage: true });
  await page.getByRole('radio', { name: /Declined payment/ }).check();
  await page.getByRole('button', { name: 'Confirm simulated payment' }).click();
  await expect(page.getByRole('alert')).toContainText('No order or keys');
  expect((await (await page.request.get('/api/orders')).json()).length).toBe(0);
  await expect(page.getByRole('link', { name: 'Cart, 1 items' })).toBeVisible();
  await page.getByRole('radio', { name: /Successful payment/ }).check();
  await page.getByRole('button', { name: 'Confirm simulated payment' }).click();
  await expect(page.getByRole('heading', { name: 'Your demo keys are ready.' })).toBeVisible();
  await expect(page.locator('code')).toContainText('DEMO-');
  await expect(page.locator('.key-card')).toContainText('Nova Keys');
  const orderURL = page.url();
  const id = orderURL.split('/').pop()!;
  await page.reload();
  await expect(page.locator('code')).toContainText('DEMO-');
  await noOverflow(page);
  const second = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const secondPage = await second.newPage();
  await register(secondPage);
  await expect(secondPage.getByRole('heading', { name: 'Your library' })).toBeVisible();
  expect((await secondPage.request.get('/api/orders/' + id)).status()).toBe(404);
  await second.close();
  await page.getByRole('link', { name: 'View all orders' }).click();
  await expect(page.locator('.order-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto(orderURL);
  await expect(page).toHaveURL(/login/);
  expect((await page.request.get('/api/orders/' + id)).status()).toBe(401);
  expect(errors).toEqual([]);
});

test('changed prices require explicit acceptance and a second payment confirmation', async ({
  page,
}) => {
  await register(page);
  await expect(page.getByRole('heading', { name: 'Your library' })).toBeVisible();
  await page.goto('/product/elden-ring');
  await page.getByRole('button', { name: 'Add Pixel Harbor offer to cart' }).click();
  await page.evaluate(() => {
    const cart = JSON.parse(localStorage.getItem('eneba-cart') || '[]');
    cart[0].expected_price_cents += 100;
    localStorage.setItem('eneba-cart', JSON.stringify(cart));
  });
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Confirm simulated payment' }).click();
  await expect(page.getByRole('heading', { name: 'Review updated prices' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm simulated payment' })).toBeDisabled();
  expect((await (await page.request.get('/api/orders')).json()).length).toBe(0);
  await page.getByRole('button', { name: 'Accept updated prices' }).click();
  expect((await (await page.request.get('/api/orders')).json()).length).toBe(0);
  await page.getByRole('button', { name: 'Confirm simulated payment' }).click();
  await expect(page.getByRole('heading', { name: 'Your demo keys are ready.' })).toBeVisible();
  await expect(page.locator('.key-card')).toContainText('€7.99');
});

test('search keyboard navigation, no match, partial search, pagination and login', async ({
  page,
}) => {
  await page.goto('/store');
  await expect(page.locator('.product-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('.product-card')).toHaveCount(12);
  const search = page.getByRole('combobox', { name: 'Search games' });
  await search.fill('cyber');
  await expect(page.getByRole('option', { name: /Cyberpunk 2077/ })).toBeVisible();
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page.getByRole('heading', { name: 'Cyberpunk 2077', exact: true })).toBeVisible();
  await search.fill('zzzzzznomatch');
  await search.press('Enter');
  await expect(page.getByRole('heading', { name: 'No games found' })).toBeVisible();
  const email = unique();
  await page.goto('/register');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('demo-password-123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your library' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('demo-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your library' })).toBeVisible();
  await noOverflow(page);
});
