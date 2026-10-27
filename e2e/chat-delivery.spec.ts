import { mkdir } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { startNostrRelay } from './helpers/nostr-relay';
import { forceStandalone } from './helpers/display-mode';

const PASSPHRASE = 'correct horse battery staple extra';
const ROOM = 'ct_browser_room';
let relay: Awaited<ReturnType<typeof startNostrRelay>>;
let roomConfigured = true;
const accounts = new Map<string, string>();
const members = new Set<string>();

async function prepare(page: Page) {
  page.setDefaultTimeout(20_000);
  await forceStandalone(page);
  await page.addInitScript(() => localStorage.setItem('onboarding:skip', 'true'));
  await page.route('**/api/rooms/config', (route) => route.fulfill({
    json: {
      relay_url: roomConfigured ? relay.url : '', admin_pubkey: '',
    },
  }));
  await page.route(/\/api\/rooms\?/, (route) => {
    const address = new URL(route.request().url()).searchParams.get('address')!;
    const pubkey = accounts.get(address);
    return route.fulfill({
      json: {
        items: pubkey ? [{
          sale_address: ROOM,
          token_address: 'ct_browser_token',
          symbol: 'TEST',
          is_private: true,
          is_community: true,
          min_token_threshold: '1',
          role: 'member',
          relay_state: members.has(pubkey) ? 'added' : 'removed',
          member_pubkey: pubkey,
          readable: members.has(pubkey),
        }] : [],
      },
    });
  });
  await page.route(/\/api\/accounts\/ak_/, (route) => route.fulfill({
    json: {
      links: { nostr: 'linked-test-account' },
    },
  }));
  // Never send a blockchain transaction from this test.
  await page.route('**/v3/transactions', (route) => (
    route.request().method() === 'POST' ? route.abort() : route.continue()
  ));
}

async function unlock(page: Page) {
  await page.getByRole('button', { name: 'Unlock chat', exact: true }).click();
  await page.locator('input[type="password"]').fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Approve & unlock' }).click();
  await expect(page.getByRole('button', { name: 'Approve & unlock' })).toBeHidden({ timeout: 30_000 });
}

/** Create a real encrypted wallet through the UI, then use its chat unlock prompt. */
async function onboard(page: Page, register = false) {
  await page.goto('/');
  await page.getByRole('button', { name: /connect wallet/i }).filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /^Create a wallet/ }).click();
  await page.getByText('Write down your recovery phrase').waitFor();
  const tiles = await page.locator('div.grid.grid-cols-3 > div').allInnerTexts();
  const words = tiles.map((text) => text.replace(/^\s*\d+\s*/, '').trim());
  await page.getByRole('button', { name: "I've written them down" }).click();
  for (let n = 0; n < 2; n += 1) {
    // eslint-disable-next-line no-await-in-loop
    const label = await page.locator(`label[for="vw${n}"]`).innerText();
    // eslint-disable-next-line no-await-in-loop
    await page.locator(`#vw${n}`).fill(words[Number(label.match(/\d+/)?.[0]) - 1]);
  }
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('input[type="password"]').nth(0).fill(PASSPHRASE);
  await page.locator('input[type="password"]').nth(1).fill(PASSPHRASE);
  await page.getByRole('button', { name: 'Create wallet' }).click();
  await page.getByText('Unlock with this device').waitFor({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('#recovery-saved').check();
  await page.getByRole('button', { name: 'Finish setup' }).click();
  const address = (await page.locator('p.font-mono.text-emerald-400').innerText()).trim();
  await page.getByRole('button', { name: 'Open wallet' }).click();
  await page.evaluate((active) => {
    localStorage.setItem('account:activeAccount', JSON.stringify(active));
  }, address);
  await page.goto('/chat');
  if (register) {
    await page.getByRole('button', { name: 'Enable', exact: true }).click();
    await page.locator('input[type="password"]').fill(PASSPHRASE);
    await page.getByRole('button', { name: 'Approve & link', exact: true }).click();
    await page.getByRole('button', { name: 'Approve & sign', exact: true }).waitFor();
    await page.locator('input[type="password"]').fill(PASSPHRASE);
    await page.getByRole('button', { name: 'Approve & sign', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Enable Chat', exact: true })).toBeHidden();
  }
  await unlock(page);
  // Read only the public identity; all keys were derived by the real wallet flow.
  const pubkey: string = await page.evaluate(async () => {
    const modulePath = '/src/features/chat/session/room-session.ts';
    const { roomKeySession } = await import(modulePath);
    return roomKeySession.keys.publicKey;
  });
  accounts.set(address, pubkey);
  return { address, pubkey };
}
async function openChat(page: Page, path: string) {
  await page.goto(path);
  await unlock(page);
  await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
}
async function openDmInSession(page: Page, pubkey: string) {
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await page.getByRole('textbox', { name: 'Chat target' }).fill(pubkey);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unlock chat', exact: true })).toHaveCount(0);
}
async function send(page: Page, text: string) {
  await page.getByLabel('Message', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
}

async function captureDesign(page: Page, name: string) {
  if (!process.env.CHAT_DESIGN_SCREENSHOTS) return;
  if (name.startsWith('inbox')) {
    await expect(page).toHaveURL(/\/chat\/?$/);
    await expect(page.locator('.chat-shell--inbox')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Relay settings', exact: true })).toBeInViewport();
    await expect.poll(() => page.evaluate(() => {
      const tools = document.querySelector('.chat-sidebar-footer')!.getBoundingClientRect();
      const nav = document.querySelector('.mobile-app-footer')!;
      const bottom = getComputedStyle(nav).display === 'none' ? window.innerHeight : nav.getBoundingClientRect().top;
      return Math.round(tools.bottom - bottom);
    })).toBeLessThanOrEqual(0);
  }
  await mkdir(process.env.CHAT_DESIGN_SCREENSHOTS, { recursive: true });
  await page.screenshot({ path: `${process.env.CHAT_DESIGN_SCREENSHOTS}/${name}.png` });
}

// Reproduce a mobile visual-viewport resize without requiring an OS keyboard in CI.
async function checkKeyboardViewport(page: Page) {
  await page.getByLabel('Message', { exact: true }).focus();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 440 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  try {
    await expect.poll(() => page.getByLabel('Message', { exact: true }).evaluate((input) => input.getBoundingClientRect().bottom <= 440)).toBe(true);
    await expect(page.locator('.mobile-app-footer')).toBeHidden();
  } finally {
    await page.evaluate(() => {
      Reflect.deleteProperty(window.visualViewport!, 'height');
      window.visualViewport!.dispatchEvent(new Event('resize'));
    });
  }
  await expect(page.locator('.mobile-app-footer')).toBeVisible();
}

async function checkResponsiveMessenger(page: Page, scene: string) {
  const sizes = [
    { width: 1920, height: 1080 }, { width: 1440, height: 1000 },
    { width: 1024, height: 768 }, { width: 820, height: 1180 },
    { width: 768, height: 1024 }, { width: 767, height: 800 },
    { width: 390, height: 844 }, { width: 320, height: 568 },
  ];
  for (let index = 0; index < sizes.length; index += 1) {
    const size = sizes[index];
    // eslint-disable-next-line no-await-in-loop
    await page.setViewportSize(size);
    const sidebar = page.getByRole('complementary', { name: 'Chat list' });
    // eslint-disable-next-line no-await-in-loop
    if (size.width >= 768) await expect(sidebar).toBeVisible();
    // eslint-disable-next-line no-await-in-loop
    else await expect(sidebar).toBeHidden();
    // eslint-disable-next-line no-await-in-loop
    await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
    // eslint-disable-next-line no-await-in-loop
    await expect.poll(() => page.evaluate(() => {
      const composer = document.querySelector('.chat-composer')!.getBoundingClientRect();
      const shell = document.querySelector('.chat-shell')!.getBoundingClientRect();
      const input = document.querySelector('.chat-composer textarea')!.getBoundingClientRect();
      const sendButton = document.querySelector('.chat-composer button')!.getBoundingClientRect();
      const footer = document.querySelector('.mobile-app-footer')!;
      const bottom = getComputedStyle(footer).display === 'none' ? window.innerHeight : footer.getBoundingClientRect().top;
      return document.documentElement.scrollWidth <= window.innerWidth
        && composer.left >= 0 && composer.right <= window.innerWidth
        && composer.top >= 0 && composer.bottom <= bottom + 1
        && sendButton.left >= input.right && Math.abs(bottom - shell.bottom) <= 20;
    })).toBe(true);
    if (process.env.CHAT_DESIGN_SCREENSHOTS && [1440, 820, 390, 320].includes(size.width)) {
      // Screenshots are taken only after wallet creation and unlock have finished.
      // eslint-disable-next-line no-await-in-loop
      await mkdir(process.env.CHAT_DESIGN_SCREENSHOTS, { recursive: true });
      // eslint-disable-next-line no-await-in-loop
      await page.screenshot({ path: `${process.env.CHAT_DESIGN_SCREENSHOTS}/${scene}-${size.width}.png` });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

test.beforeAll(async () => { relay = await startNostrRelay(18777); });
test.afterAll(async () => { await relay?.close(); });

test('two wallets exchange DMs and private-room messages; history, revocation and config failures', async ({ browser }) => {
  const contextA = await browser.newContext({ baseURL: 'http://localhost:5186', viewport: { width: 1440, height: 1000 } });
  const contextB = await browser.newContext({ baseURL: 'http://localhost:5186', viewport: { width: 390, height: 844 } });
  const alice = await contextA.newPage();
  const bob = await contextB.newPage();
  try {
    await prepare(alice);
    await prepare(bob);
    const a = await onboard(alice);
    await captureDesign(alice, 'inbox-desktop');
    const b = await onboard(bob);
    expect(a.pubkey).not.toBe(b.pubkey);
    // The inbox unlock covers all in-app navigation in this document.
    await openDmInSession(alice, b.pubkey);
    await openDmInSession(bob, a.pubkey);
    await send(alice, '  Alice to Bob browser DM  ');
    await expect(bob.locator('.chat-message-list').getByText('Alice to Bob browser DM', { exact: true })).toHaveCount(1);
    await send(bob, 'Bob to Alice browser DM');
    await expect(alice.locator('.chat-message-list').getByText('Bob to Alice browser DM', { exact: true })).toHaveCount(1);
    await expect(alice.locator(`.chat-list a[href="/chat/dm/${b.pubkey}"]`)).toHaveAttribute('aria-current', 'page');
    await alice.getByLabel('Search chats').fill('no-such-conversation');
    await expect(alice.getByText('No matches found')).toBeVisible();
    await expect(alice.getByLabel('Message', { exact: true })).toBeVisible();
    await alice.getByRole('button', { name: 'Clear chat search' }).click();
    // Multi-line drafts and keyboard send share the same delivery path.
    await alice.getByLabel('Message', { exact: true }).fill('First line');
    await alice.getByLabel('Message', { exact: true }).press('Shift+Enter');
    await alice.getByLabel('Message', { exact: true }).pressSequentially('Second line');
    await expect(alice.getByLabel('Message', { exact: true })).toHaveValue('First line\nSecond line');
    await alice.getByLabel('Message', { exact: true }).press('Enter');
    await expect(bob.locator('.chat-message-bubble').filter({ hasText: 'Second line' }))
      .toHaveText('First line\nSecond line', { useInnerText: true });
    await checkResponsiveMessenger(alice, 'dm');
    await send(alice, `${'A longer message that wraps naturally. '.repeat(35)}${'a'.repeat(160)}`);
    await alice.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => alice.locator('.chat-message-list').evaluate((list) => list.scrollHeight > list.clientHeight)).toBe(true);
    await alice.locator('.chat-message-list').evaluate((list) => list.scrollTo({ top: 0 }));
    await expect(alice.getByRole('button', { name: 'Send message' })).toBeInViewport();
    await expect.poll(() => alice.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    )).toBe(true);
    await checkKeyboardViewport(alice);
    await alice.setViewportSize({ width: 1440, height: 1000 });
    await bob.getByRole('link', { name: 'Back to chat', exact: true }).click();
    await openDmInSession(bob, a.pubkey);
    await expect(bob.locator('.chat-message-list').getByText('Alice to Bob browser DM', { exact: true })).toHaveCount(1);
    // A full document reload starts a new memory-only session.
    await openChat(bob, `/chat/dm/${a.pubkey}`);
    await expect(bob.locator('.chat-message-list').getByText('Alice to Bob browser DM', { exact: true })).toHaveCount(1);

    members.add(a.pubkey);
    members.add(b.pubkey);
    relay.rooms.set(ROOM, { private: true, members });
    await openChat(alice, `/chat/${ROOM}`);
    await openChat(bob, `/chat/${ROOM}`);
    await send(alice, 'Alice private room message');
    await expect(bob.getByText('Alice private room message', { exact: true })).toHaveCount(1);
    await expect(alice.getByText('Alice private room message', { exact: true })).toHaveCount(1);
    await send(bob, 'Bob private room reply');
    await expect(alice.getByText('Bob private room reply', { exact: true })).toHaveCount(1);
    await checkResponsiveMessenger(alice, 'room');
    await alice.getByRole('button', { name: /^Direct/ }).click();
    await alice.getByLabel('Search chats').fill('A longer message');
    await alice.locator(`.chat-list a[href="/chat/dm/${b.pubkey}"]`).click();
    await expect(alice.getByLabel('Search chats')).toHaveValue('A longer message');
    await expect(alice.getByRole('button', { name: /^Direct/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(alice.getByLabel('Message', { exact: true })).toBeVisible();
    await expect(alice.getByRole('button', { name: 'Unlock chat', exact: true })).toHaveCount(0);
    await alice.getByRole('button', { name: 'Clear chat search' }).click();
    await alice.getByRole('button', { name: /^All/ }).click();
    await alice.locator(`.chat-list a[href="/chat/${ROOM}"]`).click();
    await bob.getByRole('link', { name: 'Room info', exact: true }).click();
    await bob.getByRole('link', { name: 'Back to room', exact: true }).click();
    await expect(bob.getByLabel('Message', { exact: true })).toBeVisible();
    await bob.getByRole('link', { name: 'Back to communities', exact: true }).click();
    await captureDesign(bob, 'inbox-mobile');
    await bob.setViewportSize({ width: 320, height: 568 });
    await expect(bob.getByLabel('Search chats')).toBeInViewport();
    await bob.getByText('About web chat', { exact: true }).click();
    await expect(bob.locator('.chat-safety')).toHaveAttribute('open', '');
    await expect(bob.getByLabel('Search chats')).toBeInViewport();
    await expect.poll(() => bob.locator('.chat-sidebar-footer').evaluate(
      (footer) => footer.getBoundingClientRect().bottom <= document.querySelector('.mobile-app-footer')!.getBoundingClientRect().top,
    )).toBe(true);
    await bob.getByText('About web chat', { exact: true }).click();
    await captureDesign(bob, 'inbox-mobile-small');
    await bob.setViewportSize({ width: 390, height: 844 });
    await openDmInSession(bob, a.pubkey);
    await bob.getByRole('link', { name: 'Back to chat', exact: true }).click();
    await bob.locator(`a[href="/chat/${ROOM}"]`).click();
    await expect(bob.getByLabel('Message', { exact: true })).toBeVisible();
    await expect(bob.getByRole('button', { name: 'Unlock chat', exact: true })).toHaveCount(0);
    await openChat(bob, `/chat/${ROOM}`);
    await expect(bob.getByText('Alice private room message', { exact: true })).toHaveCount(1);

    members.delete(b.pubkey);
    await bob.reload();
    await expect(bob.getByLabel('Message', { exact: true })).toHaveCount(0);
    await expect(bob.getByText('Alice private room message', { exact: true })).toHaveCount(0);

    roomConfigured = false;
    await alice.reload();
    await expect(alice.getByText('Token-gated chat is not configured on this server. Please try again later.'))
      .toBeVisible({ timeout: 20_000 });
    await expect(alice.getByRole('button', { name: 'Retry connection' })).toBeVisible();
    expect(relay.invalidRequests).toEqual([]);
  } finally {
    await contextA.close().catch(() => {});
    await contextB.close().catch(() => {});
  }
});

test('fresh registration survives refresh while the account API is stale or unavailable', async ({ page }) => {
  await prepare(page);
  let linkedNpub = '';
  let submissions = 0;
  let lookupMode: 'stale' | 'missing' | 'offline' | 'linked' = 'stale';
  await page.route(/\/api\/accounts\/ak_/, (route) => {
    if (lookupMode === 'offline') return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
    if (lookupMode === 'missing') return route.fulfill({ status: 404, json: { message: 'Account not found' } });
    return route.fulfill({ json: { links: lookupMode === 'linked' ? { nostr: linkedNpub } : {} } });
  });
  await page.route('**/api/address-links/nostr/claim', (route) => {
    const { address, value } = route.request().postDataJSON();
    linkedNpub = value;
    return route.fulfill({ json: { message: `link:${address}:nostr:${value}:0`, nonce: 0, value } });
  });
  await page.route('**/api/address-links/nostr/submit', (route) => {
    submissions += 1;
    return route.fulfill({ status: 201, json: { txHash: 'th_browser_test' } });
  });
  await onboard(page, true);
  const modes = ['stale', 'missing', 'offline'] as const;
  for (let index = 0; index < modes.length; index += 1) {
    lookupMode = modes[index];
    const checked = page.waitForResponse(/\/api\/accounts\/ak_/);
    // eslint-disable-next-line no-await-in-loop
    await page.reload();
    // eslint-disable-next-line no-await-in-loop
    await checked;
    // eslint-disable-next-line no-await-in-loop
    await expect(page.getByRole('button', { name: 'Unlock chat', exact: true })).toBeVisible();
    // Unlock is a separate session grant; it must not trigger registration again.
    // eslint-disable-next-line no-await-in-loop
    await unlock(page);
    // eslint-disable-next-line no-await-in-loop
    await expect(page.getByRole('heading', { name: 'Enable Chat', exact: true })).toBeHidden();
    expect(submissions).toBe(1);
  }
  // Prolonged indexing must also offer a check, never a duplicate registration.
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith('nostr_link_submitted:'))!;
    const receipt = JSON.parse(localStorage.getItem(key)!);
    receipt.submittedAt = Date.now() - 16 * 60_000;
    localStorage.setItem(key, JSON.stringify(receipt));
  });
  lookupMode = 'stale';
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Could not check your chat registration');
  await expect(page.getByRole('heading', { name: 'Enable Chat', exact: true })).toBeHidden();
  lookupMode = 'linked';
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toBeHidden();
  // Once confirmed by the backend, a later network failure is unknown, not unlinked.
  lookupMode = 'offline';
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Could not check your chat registration');
  await expect(page.getByRole('heading', { name: 'Enable Chat', exact: true })).toBeHidden();
  lookupMode = 'linked';
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toBeHidden();
  expect(submissions).toBe(1);
});
