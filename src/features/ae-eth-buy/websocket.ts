/**
 * WebSocket service for monitoring æternity network events
 */

export interface AeWebSocketMessage {
  type: string;
  data: any;
  hash?: string;
  account?: string;
  amount?: string;
}

export class AeWebSocketService {
  private ws: WebSocket | null = null;

  private listeners: Map<string, Set<(message: AeWebSocketMessage) => void>> = new Map();

  private reconnectAttempts = 0;

  private maxReconnectAttempts = 5;

  private reconnectDelay = 1000; // Start with 1 second

  constructor(private wsUrl: string) {}

  /**
   * Connect to the WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: AeWebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
          }
        };

        this.ws.onclose = () => {
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          if (this.reconnectAttempts === 0) {
            reject(new Error('Failed to connect to WebSocket'));
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(
    messageType: string,
    callback: (message: AeWebSocketMessage) => void,
  ): () => void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, new Set());
    }

    const callbacks = this.listeners.get(messageType)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(messageType);
      }
    };
  }

  /**
   * Wait for æETH deposit to complete
   */
  waitForAeEthDeposit(
    aeAccount: string,
    expectedAmount: bigint,
    timeoutMs: number = 300_000,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);

      const unsubscribe = this.subscribe('bridge_deposit', (message) => {
        if (
          message.account === aeAccount
          && message.amount
          && BigInt(message.amount) >= expectedAmount
        ) {
          clearTimeout(timeout);
          unsubscribe();
          resolve(true);
        }
      });

      // Also listen for general transaction events
      const unsubscribeTx = this.subscribe('transaction', (message) => {
        // Check if this is a bridge-related transaction for our account
        if (message.data?.recipient === aeAccount) {
          // Additional validation logic can be added here
        }
      });

      // Clean up both subscriptions on timeout
      const originalTimeout = timeout;
      clearTimeout(originalTimeout);
      setTimeout(() => {
        unsubscribe();
        unsubscribeTx();
        resolve(false);
      }, timeoutMs);
    });
  }

  private handleMessage(message: AeWebSocketMessage): void {
    const callbacks = this.listeners.get(message.type);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
        }
      });
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1);

    setTimeout(() => {
      this.connect().catch((error) => {
      });
    }, delay);
  }
}

/**
 * Global WebSocket service instance
 */
let globalWsService: AeWebSocketService | null = null;

export function getWebSocketService(wsUrl?: string): AeWebSocketService {
  if (!globalWsService && wsUrl) {
    globalWsService = new AeWebSocketService(wsUrl);
  }

  if (!globalWsService) {
    throw new Error('WebSocket service not initialized. Provide wsUrl on first call.');
  }

  return globalWsService;
}
