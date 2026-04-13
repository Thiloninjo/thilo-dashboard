type WSHandler = (message: any) => void;
const handlers = new Set<WSHandler>();

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout>;

function connect(): void {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handlers.forEach((h) => h(message));
  };

  ws.onclose = () => {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 3000);
  };
}

export function onWSMessage(handler: WSHandler): () => void {
  handlers.add(handler);
  if (!ws) connect();
  return () => handlers.delete(handler);
}
