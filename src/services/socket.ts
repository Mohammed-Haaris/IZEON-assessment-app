import { io, Socket } from "socket.io-client";

const RAW_SOCKET_URL = import.meta.env.VITE_API_BASE_URL_SOCKET_SERVER || "http://localhost:5000";
const SOCKET_SERVER_URL = RAW_SOCKET_URL.replace(/\/$/, "");

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};
