export type InvitationInfo = {
  inviter: string; // ak_
  invitee: string; // ak_
  secretKey?: string; // private key (only for locally generated invites)
  amount: number; // AE amount attached per invite
  date: number; // ms
};

const LS_KEY = 'invite_list';

function readAll(): InvitationInfo[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function writeAll(list: InvitationInfo[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

export function addGeneratedInvites(inviter: string, items: Array<{ invitee: string; secretKey: string; amount: number }>) {
  const now = Date.now();
  const list = readAll();
  items.forEach(({ invitee, secretKey, amount }) => {
    list.unshift({ inviter, invitee, secretKey, amount, date: now });
  });
  writeAll(list);
}

export function removeStoredInvite(inviter: string, inviteeOrSecretKey: string) {
  const list = readAll();
  const filtered = list.filter((x) => !(x.inviter === inviter && (x.invitee === inviteeOrSecretKey || x.secretKey === inviteeOrSecretKey)));
  writeAll(filtered);
}

export function getActiveAccountInviteList(inviter: string): InvitationInfo[] {
  return readAll().filter((x) => x.inviter === inviter);
}

export function getSecretKeyByInvitee(inviter: string, invitee: string): string | undefined {
  return readAll().find((x) => x.inviter === inviter && x.invitee === invitee)?.secretKey;
}

export function prepareInviteLink(secretKey: string) {
  return `${location.protocol}//${location.host}#invite_code=${secretKey}`;
}


