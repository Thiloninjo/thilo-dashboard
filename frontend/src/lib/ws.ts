type WSHandler = (message: any) => void;
const handlers = new Set<WSHandler>();

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout>;
let reconnectAttempt = 0;
const MAX_BACKOFF = 30_000; // Cap at 30s

function getBackoff(): number {
  const delay = Math.min(1_000 * Math.pow(2, reconnectAttempt), MAX_BACKOFF);
  reconnectAttempt++;
  return delay;
}

function connect(): void {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onopen = () => {
    reconnectAttempt = 0; // Reset backoff on successful connection
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handlers.forEach((h) => h(message));
    } catch {}
  };

  ws.onclose = () => {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, getBackoff());
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function onWSMessage(handler: WSHandler): () => void {
  handlers.add(handler);
  if (!ws) connect();
  return () => handlers.delete(handler);
}
