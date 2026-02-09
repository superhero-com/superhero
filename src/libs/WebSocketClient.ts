/* eslint-disable class-methods-use-this */
import {
  WEB_SOCKET_CHANNELS,
  WEB_SOCKET_RECONNECT_TIMEOUT,
} from '@/utils/constants';
import type {
  ITopHeader,
  ITransaction,
  IWebSocketSubscriptionMessage,
  WebSocketChannelName,
} from '@/utils/types';
import { io, Socket } from 'socket.io-client';
import { v4 as genUuid } from 'uuid';

class WebSocketClient {
  private static instance: WebSocketClient;

  socketClient?: Socket;

  isWsConnected = false;

  subscribersQueue: IWebSocketSubscriptionMessage[] = [];

  subscribers: Record<
    WebSocketChannelName,
    Record<string, (payload: ITransaction | ITopHeader) => void>
  > = {
      [WEB_SOCKET_CHANNELS.TokenCreated]: {},
      [WEB_SOCKET_CHANNELS.TokenUpdated]: {},
      [WEB_SOCKET_CHANNELS.TokenTransaction]: {},
      [WEB_SOCKET_CHANNELS.TokenHistory]: {},
    };

  setUpSocketListeners() {
    if (!this.socketClient) {
      return;
    }
    this.socketClient.on('connect', () => this.handleWebsocketOpen());
    this.socketClient.on('disconnect', () => this.handleWebsocketClose());
    this.socketClient.on(WEB_SOCKET_CHANNELS.TokenCreated, (message: any) => {
      this.handleWebsocketMessage({
        subscription: WEB_SOCKET_CHANNELS.TokenCreated,
        payload: message,
      });
    });
    this.socketClient.on(WEB_SOCKET_CHANNELS.TokenUpdated, (message: any) => {
      this.handleWebsocketMessage({
        subscription: `${WEB_SOCKET_CHANNELS.TokenUpdated}::${message.sale_address}`,
        payload: message,
      });
    });
    this.socketClient.on(WEB_SOCKET_CHANNELS.TokenTransaction, (message: any) => {
      this.handleWebsocketMessage({
        subscription: WEB_SOCKET_CHANNELS.TokenTransaction,
        payload: message,
      });
      this.handleWebsocketMessage({
        subscription: `${WEB_SOCKET_CHANNELS.TokenTransaction}::${message.sale_address}`,
        payload: message,
      });
    });
    this.socketClient.on(WEB_SOCKET_CHANNELS.TokenHistory, (message: any) => {
      this.handleWebsocketMessage({
        subscription: `${WEB_SOCKET_CHANNELS.TokenHistory}::${message.sale_address}`,
        payload: message,
      });
      this.handleWebsocketMessage({
        subscription: `${WEB_SOCKET_CHANNELS.TokenHistory}`,
        payload: message,
      });
    });
  }

  private handleWebsocketOpen() {
    this.isWsConnected = true;
    try {
      this.subscribersQueue.forEach((message) => {
        if (!this.socketClient) {
          return;
        }
        this.socketClient.emit('message', message);
      });
    } catch (error) {
      setTimeout(() => {
        this.handleWebsocketOpen();
      }, WEB_SOCKET_RECONNECT_TIMEOUT);
    }
  }

  private handleWebsocketClose() {
    this.isWsConnected = false;
  }

  isConnected(): boolean {
    return this.isWsConnected;
  }

  subscribeForChannel(message: IWebSocketSubscriptionMessage, callback: (payload: any) => void) {
    const location = message.target ? `${message.payload}::${message.target}` : message.payload;
    const uuid = genUuid();
    if (!this.subscribers[location]) {
      this.subscribers[location] = {};
    }
    this.subscribers[location][uuid] = callback;
    return () => {
      delete this.subscribers[location][uuid];
    };
  }

  subscribeForTokenUpdates(sale_address: string, callback: (payload: ITransaction) => void) {
    return this.subscribeForChannel(
      {
        payload: WEB_SOCKET_CHANNELS.TokenUpdated,
        target: sale_address,
      },
      callback,
    );
  }

  subscribeForTransactions(callback: (payload: ITransaction) => void) {
    return this.subscribeForChannel(
      {
        payload: WEB_SOCKET_CHANNELS.TokenHistory,
      },
      callback,
    );
  }

  subscribeForTokenHistories(sale_address: string, callback: (payload: any) => void) {
    return this.subscribeForChannel(
      {
        payload: WEB_SOCKET_CHANNELS.TokenHistory,
        target: sale_address,
      },
      callback,
    );
  }

  subscribeToNewTokenSales(callback: (payload: ITransaction) => void) {
    return this.subscribeForChannel({ payload: WEB_SOCKET_CHANNELS.TokenCreated }, callback);
  }

  private handleWebsocketMessage(message: any) {
    if (!message) {
      return;
    }
    try {
      const data: any = message;

      if (
        !data.payload
        || !data.subscription
        || !this.subscribers[data.subscription as WebSocketChannelName]
      ) {
        return;
      }

      // Call all subscribers for the channel
      Object.values(this.subscribers[data.subscription as WebSocketChannelName]).forEach(
        (subscriberCb) => subscriberCb(data.payload),
      );
    } catch (error) {
    }
  }

  disconnect() {
    if (!this.socketClient) {
      return;
    }
    try {
      this.socketClient.disconnect();
      this.socketClient.off('connect', this.handleWebsocketOpen);
      this.socketClient.off('disconnect', this.handleWebsocketClose);
      this.socketClient.off('message', this.handleWebsocketMessage);
    } catch {
      //
    }
    this.socketClient = undefined;
  }

  connect(url: string) {
    if (this.socketClient) {
      this.disconnect();
    }

    this.socketClient = io(url, { autoConnect: false });
    this.setUpSocketListeners();
    this.socketClient.connect();
  }

  static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }
}

export default WebSocketClient.getInstance();
