import { Telemetry } from '../types';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUrl: string | null = null;
  private shouldReconnect = false;
  private messageHandler: ((data: Telemetry) => void) | null = null;
  private openHandler:    (() => void) | null = null;
  private closeHandler:   (() => void) | null = null;

  connect(url: string) {
    if (this.currentUrl === url && this.ws
      && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.disconnect();
    this.currentUrl = url;
    this.shouldReconnect = true;

    const socket = new WebSocket(url);
    this.ws = socket;

    socket.onopen = () => {
      if (this.ws !== socket) return;
      console.log('WebSocket connected');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.openHandler?.();
    };

    socket.onmessage = (event) => {
      if (this.ws === socket && this.messageHandler) {
        try {
          const data = JSON.parse(event.data);
          this.messageHandler(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      if (this.ws === socket) this.ws = null;
      if (this.shouldReconnect && this.currentUrl === url) {
        this.closeHandler?.();
        this.scheduleReconnect(url);
      }
    };
  }

  private scheduleReconnect(url: string) {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      this.connect(url);
    }, this.reconnectInterval);
  }

  onMessage(handler: (data: Telemetry) => void) {
    this.messageHandler = handler;
  }

  onOpen(handler: () => void) {
    this.openHandler = handler;
  }

  onClose(handler: () => void) {
    this.closeHandler = handler;
  }

  disconnect() {
    this.shouldReconnect = false;
    this.currentUrl = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      socket.close();
    }
  }
}

export const websocketService = new WebSocketService();
