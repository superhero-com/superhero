import { readFileSync } from 'node:fs';
import {
  test, expect, type Page, type Route,
} from '@playwright/test';
import {
  AciContractCallEncoder, ContractByteArrayEncoder, TypeResolver,
} from '@aeternity/aepp-calldata';
import {
  encode, Encoding, Tag, unpackTx,
} from '@aeternity/aepp-sdk';

/**
 * The æternity governance polls under the DAO section, through the real app.
 *
 * The poll list joins two sources: titles from the on-chain registry (a dry-run of
 * `Registry.polls()`) and ordering/vote counts from the governance server. Both are faked
 * here, with the chain height, so the list is fixed. App boot and every other call use the
 * real network, as in the other specs.
 */

const REGISTRY_ACI = JSON.parse(
  readFileSync(new URL('../src/api/GovernanceRegistryACI.json', import.meta.url), 'utf8'),
);
const registry = new AciContractCallEncoder(REGISTRY_ACI);
const POLLS_FUNCTION_ID = registry
  .decodeCall('Registry', 'polls', registry.encodeCall('Registry', 'polls', []))
  .functionId;

const HEIGHT = 1000;
const contract = (n: number) => encode(new Uint8Array(32).fill(n), Encoding.ContractAddress);
const AUTHOR = encode(new Uint8Array(32).fill(9), Encoding.AccountAddress);

const EXPLORER = contract(1);
const GAS = contract(2);
const TESTNET = contract(3);
const LOGO = contract(4);

// Registry entries. TESTNET is registered twice, as one mainnet poll is many times over.
const ENTRIES = [
  {
    id: 1, poll: EXPLORER, title: 'Fund the explorer', closeHeight: 2000, voteCount: 4,
  },
  {
    id: 2, poll: GAS, title: 'Raise the gas limit', closeHeight: null, voteCount: 23,
  },
  {
    id: 3, poll: TESTNET, title: 'Rename the testnet', closeHeight: 500, voteCount: 100,
  },
  {
    id: 4, poll: TESTNET, title: 'Rename the testnet', closeHeight: 500, voteCount: 100,
  },
  {
    id: 5, poll: LOGO, title: 'Adopt the new logo', closeHeight: 400, voteCount: 7,
  },
];

const POLL_DATA_TYPE = new TypeResolver().resolveType({
  map: ['int', {
    record: [
      { name: 'poll', type: 'contract_pubkey' },
      { name: 'is_listed', type: 'bool' },
      { name: 'title', type: 'string' },
      { name: 'close_height', type: { option: ['int'] } },
    ],
  }],
});
const POLLS_RESULT = new ContractByteArrayEncoder().encodeWithType(
  new Map(ENTRIES.map(({
    id, poll, title, closeHeight,
  }) => [BigInt(id), {
    poll,
    is_listed: true,
    title,
    close_height: closeHeight == null ? undefined : BigInt(closeHeight),
  }])),
  POLL_DATA_TYPE,
);

const orderingRow = ({
  id, poll, closeHeight, voteCount,
}: typeof ENTRIES[number]) => ({
  id, poll, closeHeight, voteCount, totalStake: '0', delegationCount: 0, score: 0,
});

const EXPLORER_OVERVIEW = {
  pollState: {
    metadata: {
      title: 'Fund the explorer',
      description: 'Pay for two more years of explorer hosting.',
      link: 'https://forum.aeternity.com/t/explorer',
    },
    vote_options: { 0: 'Yes', 1: 'No' },
    close_height: 2000,
    create_height: 900,
    votes: {},
    author: AUTHOR,
  },
  stakesAtHeight: [],
  stakesForOption: [
    {
      option: '0', optionStake: '600', percentageOfTotal: '60', votes: [{}, {}, {}],
    },
    {
      option: '1', optionStake: '400', percentageOfTotal: '40', votes: [{}],
    },
  ],
  totalStake: '1000',
  percentOfTotalSupply: '0.01',
  voteCount: 4,
};

const json = (route: Route, body: unknown) => route.fulfill({
  status: 200, contentType: 'application/json', body: JSON.stringify(body),
});

/** Fakes the governance data; set `server.down` to make the governance server fail. */
async function fakeGovernance(page: Page, server = { down: false }) {
  await page.route((url) => url.hostname.startsWith('governance-server'), (route) => {
    const url = new URL(route.request().url());
    if (server.down) return route.fulfill({ status: 503, body: '' });
    if (url.pathname.endsWith('/pollOrdering')) {
      const closed = url.searchParams.get('closed') === 'true';
      const rows = ENTRIES
        .filter((e) => (e.closeHeight != null && e.closeHeight <= HEIGHT) === closed)
        .map(orderingRow);
      return json(route, { ordering: rows.map((r) => r.id), data: rows });
    }
    if (url.pathname.endsWith(`/pollOverview/${EXPLORER}`)) return json(route, EXPLORER_OVERVIEW);
    if (url.pathname.includes('/delegatedPower/')) {
      return json(route, { delegatedPower: '0', delegationTree: {}, flattenedDelegationTree: [] });
    }
    return route.fulfill({ status: 404, body: '' });
  });

  await page.route(
    (url) => url.pathname.endsWith('/v3/key-blocks/current/height'),
    (route) => json(route, { height: HEIGHT }),
  );

  // Answers only the registry's `polls()`; any other dry-run goes to the real node.
  await page.route((url) => url.pathname.endsWith('/v3/dry-run'), (route) => {
    const call = unpackTx(route.request().postDataJSON().txs[0].tx, Tag.ContractCallTx);
    let functionId: string | undefined;
    try {
      ({ functionId } = registry.decodeCall('Registry', 'polls', call.callData));
    } catch {
      functionId = undefined;
    }
    if (functionId !== POLLS_FUNCTION_ID) return route.fallback();
    return json(route, {
      results: [{
        type: 'contract_call',
        result: 'ok',
        call_obj: {
          caller_id: call.callerId,
          caller_nonce: call.nonce,
          contract_id: call.contractId,
          gas_price: 1000000000,
          gas_used: 1000,
          height: HEIGHT,
          log: [],
          return_type: 'ok',
          return_value: POLLS_RESULT,
        },
      }],
    });
  });
}

test.describe('æternity governance polls', () => {
  test.use({ locale: 'en-US' });

  test.beforeEach(async ({ page }) => {
    // Keep the first-visit welcome modal from auto-opening (App.tsx).
    await page.addInitScript(() => window.localStorage.setItem('onboarding:skip', 'true'));
  });

  test('the DAO page opens the polls tab and the DAO section stays current', async ({ page }) => {
    await fakeGovernance(page);
    await page.goto('/trends/daos');

    await page.getByRole('link', { name: 'æternity polls' }).click();

    await expect(page).toHaveURL(/\/voting$/);
    await expect(page.getByText('Fund the explorer')).toBeVisible();
    await expect(page.getByText('Raise the gas limit')).toBeVisible();
    await expect(page.getByText('No end date')).toBeVisible();
    await expect(page.getByText('2 Active')).toBeVisible();
    await expect(page.getByRole('link', { name: 'DAO', exact: true }).filter({ visible: true }))
      .toHaveAttribute('aria-current', 'page');

    await page.getByRole('link', { name: 'Token DAOs' }).click();
    await expect(page).toHaveURL(/\/trends\/daos$/);
  });

  test('the closed filter lists each closed poll once', async ({ page }) => {
    await fakeGovernance(page);
    await page.goto('/voting');
    await expect(page.getByText('Fund the explorer')).toBeVisible();

    await page.getByRole('combobox').filter({ hasText: 'Open polls' }).click();
    await page.getByRole('option', { name: /Closed polls/ }).click();

    await expect(page.getByText('Adopt the new logo')).toBeVisible();
    await expect(page.getByText('Rename the testnet')).toHaveCount(1);
    await expect(page.getByText('2 Closed')).toBeVisible();
    await expect(page.getByText('Fund the explorer')).toBeHidden();

    await page.getByLabel('Search polls').fill('LOGO');
    await expect(page.getByText('Adopt the new logo')).toBeVisible();
    await expect(page.getByText('Rename the testnet')).toBeHidden();
  });

  test('a poll opens from the list with its options and results', async ({ page }) => {
    await fakeGovernance(page);
    await page.goto('/voting');

    await page.getByText('Fund the explorer').click();

    await expect(page).toHaveURL(new RegExp(`/voting/p/${EXPLORER}$`));
    await expect(page.getByRole('heading', { name: 'Fund the explorer' })).toBeVisible();
    await expect(page.getByText('Pay for two more years of explorer hosting.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'https://forum.aeternity.com/t/explorer' }))
      .toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.getByRole('button', { name: /Yes\s*Click to vote/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: /No\s*Click to vote/ })).toBeEnabled();
    await expect(page.getByText('Total Votes').locator('xpath=following-sibling::p')).toHaveText('4');
  });

  test('a governance server outage shows a retry that recovers', async ({ page }) => {
    const server = { down: true };
    await fakeGovernance(page, server);
    await page.goto('/voting');

    await expect(page.getByText("Couldn't load polls.")).toBeVisible();
    await expect(page.getByText('No polls found')).toBeHidden();

    server.down = false;
    await page.getByRole('button', { name: 'Try again' }).click();

    await expect(page.getByText('Fund the explorer')).toBeVisible();
  });
});
