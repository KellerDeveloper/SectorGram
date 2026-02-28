import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "../api/client";

const SOCKET_PATH = "/socket.io";
const SOCKET_URL = import.meta.env.VITE_API_URL || "";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const url = SOCKET_URL || window.location.origin;
    const s = io(url, {
      auth: { token },
      path: SOCKET_PATH,
      transports: ["websocket", "polling"],
    });
    setSocket(s);
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, []);

  return { socket, connected };
}

export function useSocketOn<T>(socket: Socket | null, event: string, handler: (data: T) => void) {
  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
