import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store room data: { ROOMCODE: [socketId1, socketId2] }
const rooms = {};

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  // 🟦 CREATE ROOM
  socket.on("create-room", ({ roomCode }) => {
    if (rooms[roomCode]) {
      socket.emit("room:error", { message: "Room already exists" });
      return;
    }
    console.log("Created room codee", roomCode );
    rooms[roomCode] = [socket.id];
    socket.join(roomCode);
    console.log(`🟩 Room ${roomCode} created by ${socket.id}`);
    socket.emit("room:created", { roomCode });
  });

  // 🟦 JOIN ROOM
  socket.on("join-room", ({ roomCode }, callback) => {
    const room = rooms[roomCode];

    if (!room) {
      console.log(`❌ Join failed: Room ${roomCode} not found`);
      callback?.({ success: false, message: "Room not found" });
      return;
    }

    console.log("room codee", roomCode );
    

    if (room.length >= 2) {
      console.log(`🚫 Room ${roomCode} is full`);
      callback?.({ success: false, message: "Room is full" });
      return;
    }

    room.push(socket.id);
    socket.join(roomCode);
    console.log(`🟨 ${socket.id} joined room ${roomCode}`);

    // Inform caller that joining succeeded
    callback?.({ success: true });

    // Notify the other user
    socket.to(roomCode).emit("user:joined", { id: socket.id });
  });

  // 🟥 Handle Disconnect: clean up rooms
  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
    for (const code in rooms) {
      rooms[code] = rooms[code].filter((id) => id !== socket.id);
      if (rooms[code].length === 0) {
        delete rooms[code];
        console.log(`🧹 Room ${code} deleted`);
      }
    }
  });

  // 🛰 WebRTC Signaling Events
    socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
