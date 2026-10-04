export interface Short {
  contentWarning?: 'feed-excluded' | 'unreviewed';
  hostingStatus?: 'unfunded' | 'active' | 'expired' | 'withdrawn';
  guidelines?: { status: 'analyzing' | 'reviewing' | 'eligible' | 'ineligible' | 'unavailable'; reason?: string; approval?: 'demo' };
  id: string;
  title: string;
  topic: string;
  creator: string;
  status: string;
  cid: string;
  bytes: number;
  duration: number;
  until: number;
  likes: number;
  views: number;
  liked: boolean;
  mine: boolean;
  moderation: string;
  videoUrl: string;
  posterUrl: string;
  createdAt?: number;
  description?: string;
  language?: string;
  synthetic?: boolean;
  sponsored?: boolean;
  captionsUrl?: string;
  classification?: Classification;
  reviewReason?: string;
  appeal?: { message: string; at: number; status: string };
}
export interface Account {
  address: string;
  wallet: string;
  available: string;
  earned: string;
  claimed: string;
  allocated: string;
  restored: string;
}
export interface Config {
  creatorAccess?: 'connected-wallet' | 'signed-session';
  visualModeration: boolean;
  replicas: number;
  mode: string;
  network: string;
  contract: string;
  likeFee: string;
  ipfs: boolean;
  topics: string[];
  operator: string;
  aci: unknown[];
  bytecodeHash: string;
  classification: string;
  analyticsSince: number;
}
export interface Quote {
  id: string;
  shortId: string;
  title: string;
  bytes: number;
  days: number;
  source: 'wallet' | 'rewards';
  charge: string;
  amountAettos: string;
  unused: string;
  daily: string;
  previousUntil: number;
  estimatedUntil: number;
  expiresAt: number;
}
export interface HostingPrices {
  shortId: string;
  bytes: number;
  numerator: string;
  denominator: string;
  maxDays: number;
}
export interface Dashboard {
  account: Account;
  shorts: Short[];
  totalViews: number;
  totalLikes: number;
  receipts: { tx: string; action: string; at: number }[];
  pending: {
    id: string;
    shortId: string;
    deadline: number;
    refundable: boolean;
  }[];
}
export interface Review {
  safety?: VisualSafety;
  reviewedTopic?: string;
  description?: string; language?: string; synthetic?: boolean; sponsored?: boolean;
  reviewHistory?: { at: number; operator: string; reason: string; approved: boolean; topic: string }[];
  reviewReason?: string;
  classification?: Classification;
  appeal?: { message: string; status: string };
  reportDetails?: { id: string; reason: string; detail: string; at: number }[];
  id: string;
  previewUrl: string;
  reports: number;
  title: string;
  topic: string;
  moderation: string;
}

export interface PlaybackSummary {
  views: number; reach: number; watchSeconds: number; averageSeconds: number | null;
  completion: number | null; retention: { at: number; viewers: number }[];
}
export interface LedgerEntry {
  id: string; tx: string; at: number; height: number; confirmations: number; confirmed: boolean;
  action: string; actor: string; beneficiary: string; amount: string; amountAe: string;
  shortId?: string; quoteId?: string; source?: string;
}
export interface Performance {
  days: number; start: number; end: number; timezone: string; since: number; retentionDays: number;
  partial: boolean; previousPartial: boolean; generatedAt: number;
  summary: PlaybackSummary; previous: PlaybackSummary;
  series: ({ at: number } & PlaybackSummary)[];
  videos: Record<string, PlaybackSummary>;
  sources: { source: string; views: number | null; suppressed: boolean }[];
  finance: { syncedAt: number; stale: boolean; message: string; confirmationsRequired: number; earned: string; paidLikes: number; pending: number; entries: LedgerEntry[] };
  previousFinance: { earned: string; paidLikes: number };
}
export interface Classification {
  status: string; model: string | null; topic: string; reason: string; evidenceHash: string; taxonomy: string; rubric: string;
}
export interface VisualSafety {
  status: 'no_flags' | 'review' | 'blocked' | 'error';
  reason: string; checkedAt: number; frameCount?: number; sampling?: string;
  maxNsfwScore?: number; policy?: string; evidenceHash?: string;
  labels?: { topic: string; score: number }[];
  frames?: { at: number; sha256: string; nsfwScore: number; labels: { topic: string; score: number }[] }[];
}

// In-memory only; a first wallet connection preserves the guest draft.
export interface UploadDraft {
  step: number;
  revision?: number;
  file?: File;
  title: string;
  description: string;
  topic: string;
  language: string;
  captions: string;
  synthetic: boolean;
  sponsored: boolean;
  rights: boolean;
}
