import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

export class SocketModule {
  constructor() {
    this.app = express();
    this.app.use(cors());

    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: { origin: "*" },
    });

    this.emailToSocketIdMap = new Map();
    this.socketidToEmailMap = new Map();
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      socket.on("room:join", (data) => {
        const { email, room } = data;
        this.emailToSocketIdMap.set(email, socket.id);
        this.socketidToEmailMap.set(socket.id, email);

        socket.join(room);
        this.io.to(room).emit("user:joined", { email, id: socket.id });
        this.io.to(socket.id).emit("room:join", data);
      });

      socket.on("user:call", ({ to, offer }) => {
        this.io.to(to).emit("incomming:call", { from: socket.id, offer });
      });

      socket.on("call:accepted", ({ to, ans }) => {
        this.io.to(to).emit("call:accepted", { from: socket.id, ans });
      });

      socket.on("peer:nego:needed", ({ to, offer }) => {
        this.io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
      });

      socket.on("peer:nego:done", ({ to, ans }) => {
        this.io.to(to).emit("peer:nego:final", { from: socket.id, ans });
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
      });
    });
  }

  startServer(port) {
    this.server.listen(port, () => console.log(`Server running at http://localhost:${port}`));
  }
}
