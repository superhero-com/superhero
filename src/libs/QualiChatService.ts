export type QualiMessage = {
  event_id?: string;
  origin_server_ts?: number;
  sender?: string;
  content?: { msgtype?: string; body?: string };
};

export type MessagesListResponse = {
  data: QualiMessage[];
  end: string | null;
};

export class QualiChatService {
  static API_URL = 'https://api.quali.chat';

  private static async request<T = Record<string, any>>(path: string, query?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.API_URL}${path}`);
    if (query) {
      const q = Object.fromEntries(Object.entries(query).filter(([, v]) => typeof v !== 'undefined' && v !== null));
      url.search = new URLSearchParams(q as any).toString();
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw Object.assign(new Error('Quali.chat request failed'), { status: res.status });
    return res.json() as Promise<T>;
  }

  static getTokenMessages(tokenName: string, tokenContract: string, options?: { from?: string; limit?: number }) {
    const { from, limit = 20 } = options || {};
    return this.request<MessagesListResponse>(`/rooms/PUB_${tokenName}_${tokenContract}/messages`, { from, limit });
  }
}


