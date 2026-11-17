import { readFileSync } from 'node:fs';
import BigNumber from 'bignumber.js';
import { expect, test, type Page } from '@playwright/test';
import { AeSdk, Contract, Node } from '@aeternity/aepp-sdk';

/**
 * The trade card's quotes, checked against the sale contract that would settle them.
 *
 * A real token page in a real browser quotes from the backend's token record, and the
 * contract prices from the chain. The record is pinned to the supply the chain holds right
 * now, so both start from the same state; then the contract itself is asked, by dry-run on
 * the mainnet node the dev server uses, what each quoted trade would cost or pay.
 *
 * The account is seeded through `account:activeAccount`, as in `profile-send-receive.spec.ts`:
 * the SDK needs a selected account even to dry-run, so a visitor gets no quote at all. That
 * account has no wallet behind it and broadcasting is blocked, so nothing can be signed.
 */

const NODE_URL = 'https://mdw.wordcraft.fun'; // CONFIG.NODE_URL on mainnet, the dev server's default
const ACCOUNT = 'ak_gAWT7XdGs2wtyCMPJe1K1SneofRFeDGf6Sp5ueftdev36XwHH';
// A long-dormant sale, so its supply holds still while a test runs (checked after each).
const TOKEN_NAME = 'LUSCOFUSCO';
const SALE = 'ct_cckp7hwU1rYZPbJB7UUxRu5xS3qgQj4shS9kGe2wasHv6WMAd';

const readAci = (path: string) => JSON.parse(readFileSync(new URL(`../node_modules/${path}`, import.meta.url), 'utf8'));
const SALE_ACI = readAci('bctsl-contracts/generated/AffiliationBondingCurveTokenSale.aci.json');
// A direct dependency, so npm always installs it at the top of node_modules.
const TOKEN_ACI = readAci('dex-contracts-v2/deployment/aci/FungibleTokenFull.aci.json');

const aettos = (amount: string | number) => BigInt(new BigNumber(amount).shiftedBy(18).toFixed(0));
const ae = (value: bigint) => new BigNumber(value.toString()).shiftedBy(-18).toFixed();

let contract: {
  supply: () => Promise<bigint>;
  price: (count: bigint) => Promise<bigint>;
  sellReturn: (count: bigint) => Promise<bigint>;
};

test.beforeAll(async () => {
  const sdk = new AeSdk({ nodes: [{ name: 'mainnet', instance: new Node(NODE_URL) }] });
  const sale = await Contract.initialize({ ...sdk.getContext(), aci: SALE_ACI, address: SALE });
  const token = await Contract.initialize({
    ...sdk.getContext(), aci: TOKEN_ACI, address: (await sale.token_contract()).decodedResult,
  });
  contract = {
    supply: async () => (await token.total_supply()).decodedResult,
    price: async (count) => (await sale.price(count)).decodedResult,
    sellReturn: async (count) => (await sale.sell_return(count)).decodedResult,
  };
});

let supply: bigint;

test.beforeEach(async ({ page }) => {
  supply = await contract.supply();
  await page.addInitScript((account) => {
    window.localStorage.setItem('onboarding:skip', 'true');
    window.localStorage.setItem('account:activeAccount', JSON.stringify(account));
  }, ACCOUNT);
  await page.route(/\/api\/tokens\/[^/?]+(\?|$)/, async (route) => {
    const response = await route.fetch();
    const record = await response.json().catch(() => null);
    if (record?.sale_address !== SALE) return route.fulfill({ response });
    return route.fulfill({ response, json: { ...record, total_supply: supply.toString() } });
  });
  await page.route(
    (url) => url.pathname.endsWith('/v3/transactions'),
    (route) => (route.request().method() === 'POST' ? route.abort() : route.continue()),
  );
});

test.afterEach(async () => {
  expect(await contract.supply(), `someone traded #${TOKEN_NAME} during the test; rerun it`).toBe(supply);
});

async function openTradeCard(page: Page) {
  await page.goto(`/trends/tokens/${TOKEN_NAME}`);
  const card = page.getByRole('region', { name: `Trade #${TOKEN_NAME}` });
  await expect(card).toBeVisible({ timeout: 30_000 });
  return {
    card,
    pay: card.getByRole('textbox', { name: 'You pay' }),
    receive: card.getByRole('textbox', { name: 'You receive Estimated' }),
  };
}

/** The amount the card fills in once it has the sale contract. */
async function quoted(field: ReturnType<Page['getByRole']>) {
  await expect(field).not.toHaveValue('', { timeout: 30_000 });
  return field.inputValue();
}

// The card cuts the AE side of a quote to three significant decimals.
function expectSettledAsShown(settled: bigint, shown: string) {
  const gap = settled - aettos(shown);
  expect(gap >= 0n && gap < aettos(0.001), `${ae(settled)} AE settles, ${shown} AE shown`).toBe(true);
}

test.describe(`trade quotes for #${TOKEN_NAME} match its sale contract`, () => {
  test('AE to spend: the tokens quoted cost no more than that, fee included', async ({ page }) => {
    const { pay, receive } = await openTradeCard(page);
    await pay.fill('10');
    const cost = await contract.price(aettos(await quoted(receive)));
    expect(cost <= aettos(10), `${ae(cost)} AE`).toBe(true);
    expect(cost >= aettos(9.999), `${ae(cost)} AE`).toBe(true);
  });

  test('tokens to buy: the AE quoted is what the contract charges', async ({ page }) => {
    const { pay, receive } = await openTradeCard(page);
    await receive.fill('100000');
    expectSettledAsShown(await contract.price(aettos(100000)), await quoted(pay));
  });

  test('tokens to sell: the AE quoted is what the contract pays', async ({ page }) => {
    const { card, pay, receive } = await openTradeCard(page);
    await card.getByRole('button', { name: 'Sell', exact: true }).click();
    await pay.fill('100000');
    expectSettledAsShown(await contract.sellReturn(aettos(100000)), await quoted(receive));
  });

  test('AE to receive: selling the tokens quoted pays at least that', async ({ page }) => {
    const { card, pay, receive } = await openTradeCard(page);
    await card.getByRole('button', { name: 'Sell', exact: true }).click();
    await receive.fill('1');
    const paid = await contract.sellReturn(aettos(await quoted(pay)));
    expect(paid >= aettos(1), `${ae(paid)} AE`).toBe(true);
    expect(paid < aettos(1.0001), `${ae(paid)} AE`).toBe(true);
  });
});
