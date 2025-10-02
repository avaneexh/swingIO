// server.js (Node + Socket.IO)
import { Server } from "socket.io";

const io = new Server(7000, { cors: true });

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("room:join", (data) => {
    const { email, room } = data;
    socket.join(room);
    // notify others in room that a user joined
    socket.to(room).emit("user:joined", { email, id: socket.id });
    // also inform the joining client that they joined (optional)
    socket.emit("room:join", data);
  });

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

  // NEW: forward ICE candidates
  socket.on("ice-candidate", ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    // optionally notify others
  });
});
