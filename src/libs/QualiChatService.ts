export type QualiMessage = {
  content: {
    body: string;
    'm.mentions': Record<string, any>;
    msgtype: 'm.text' | 'm.image';
  };
  sender: string;
  timestamp: number;
  type: 'm.room.message';
}

export type MessagesListResponse = {
  data: QualiMessage[];
  end: string | null;
};

export class QualiChatService {
  static API_URL = 'api.quali.chat';

  private static request<T = Record<string, any>>(
    path: string,
    query?: Record<string, any>,
  ): Promise<T> {
    const url = new URL(`https://${this.API_URL}${path}`);
    if (query) {
      const queryFiltered = Object.fromEntries(
        Object.entries(query).filter(([, val]) => typeof val !== 'undefined'),
      );
      url.search = new URLSearchParams(queryFiltered).toString();
    }
    return fetch(url).then((res) => {
      if (res.status === 200) {
        return res.json();
      } else {
        throw res;
      }
    });
  }

  public static getTokenMessages(
    tokenName: string,
    tokenContract: string,
    options?: { from?: string; limit?: number },
  ) {
    const { from, limit = 20 } = options || {};
    return this.request<MessagesListResponse>(`/rooms/PUB_${tokenName}_${tokenContract}/messages`, {
      from,
      limit,
    });
  }
}


