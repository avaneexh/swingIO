import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import { KeyRound } from "lucide-react";

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
      } 
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-sm text-center transition-transform hover:scale-[1.02] duration-300">
        <div className="flex items-center justify-center mb-4 text-indigo-600">
          <KeyRound size={36} />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Join a Room
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Enter your 6-digit room code to get started.
        </p>

        <input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="Enter 6-digit code"
          maxLength={6}
          className="w-full px-4 py-3 text-center text-lg border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />

        <button
          onClick={handleJoin}
          disabled={!roomCode || roomCode.length < 6}
          className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Join Room
        </button>
      </div>
    </div>
  );
};

export default Lobby;
