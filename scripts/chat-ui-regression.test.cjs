const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Chat is present in the desktop menu and the mobile footer regardless of PWA mode', () => {
  const navigation = src('src/components/layout/app-header/navigationItems.ts');
  assert.match(navigation, /export const getNavigationItems[\s\S]*?CHAT_ITEM/);
  assert.match(navigation, /export const getMobileFooterNavigationItems[\s\S]*?CHAT_ITEM/);
  assert.doesNotMatch(navigation, /pwaMode\s*\?\s*\[CHAT_ITEM\]/);
});

test('Home Chat action stays in Superhero', () => {
  assert.match(src('src/components/layout/QuickActionsCard.tsx'), /key: 'chat', to: '\/chat'/);
});

test('Inbox and conversations share a responsive two-pane chat workspace', () => {
  const inbox = src('src/features/chat/views/InboxView.tsx');
  const thread = src('src/features/chat/views/DmThreadView.tsx');
  assert.match(inbox, /chat-workspace/);
  assert.match(inbox, /chat-inbox-pane/);
  assert.match(thread, /chat-workspace/);
  assert.match(thread, /<InboxView embedded \/>/);
});

test('First chat viewport prioritizes the inbox over the browser safety explanation', () => {
  const inbox = src('src/features/chat/views/InboxView.tsx');
  const notice = src('src/features/chat/components/WebChatSafetyNotice.tsx');
  assert.ok(inbox.indexOf('<h1') < inbox.indexOf('<WebChatSafetyNotice'));
  assert.match(notice, /<details/);
});

test('Chat composer and room header actions have touch-sized targets', () => {
  for (const file of ['DmThreadView.tsx', 'RoomView.tsx']) {
    const view = src(`src/features/chat/views/${file}`);
    assert.match(view, /className="h-11 w-11[^>]*aria-label="Send message"/);
  }
  const room = src('src/features/chat/views/RoomView.tsx');
  assert.match(room, /className="[^"]*min-h-11 min-w-11[^"]*"\s+aria-label="Back to communities"/);
  assert.match(room, /className="[^"]*min-h-11 min-w-11[^"]*"\s+aria-label="Room info"/);
});
