import React from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const Home = () => {
  const navigate = useNavigate();
  const socket = useSocket();

  // Generate random 6-char alphanumeric code
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    const roomCode = generateRoomCode();
    socket.emit("create-room", { roomCode });
    navigate(`/room/${roomCode}`);
  };

  const handleJoinRoom = () => {
    navigate("/lobby");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <h1>🎥 Welcome to SwingIO</h1>
      <button onClick={handleCreateRoom} style={{ padding: "10px 20px", fontSize: "18px", cursor: "pointer" }}>
        Create Room
      </button>
      <button onClick={handleJoinRoom} style={{ padding: "10px 20px", fontSize: "18px", cursor: "pointer" }}>
        Join Room
      </button>
    </div>
  );
};

export default Home;
