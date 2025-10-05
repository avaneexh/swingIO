import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const Lobby = () => {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();
  const socket = useSocket();

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    console.log("room code",roomCode );
    
    socket.emit("join-room", { roomCode }, (response) => {
      if (response.success) {
        navigate(`/room/${roomCode}`);
      } else {
        alert(response.message);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <h2>🔑 Join a Room</h2>
      <input
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        placeholder="Enter 6-digit code"
        maxLength={6}
        style={{ padding: "8px", fontSize: "16px", textAlign: "center" }}
      />
      <button onClick={handleJoin} style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}>
        Join
      </button>
    </div>
  );
};

export default Lobby;
