import { io } from "socket.io-client";
import { WS_BASE_URL } from "../config/env";

let socket = null;

export function connectSocket(token) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(WS_BASE_URL, {
    auth: {
      token,
    },
  });

  return socket;
}

export function getSocket() {
  return socket;
}

