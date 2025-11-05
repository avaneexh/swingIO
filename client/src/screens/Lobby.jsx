import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import { KeyRound } from "lucide-react";
import { useTheme } from "../context/ThemeContext";


const Lobby = () => {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();
  const socket = useSocket();
  const { darkMode } = useTheme();

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
     <div
      className={`flex flex-col items-center justify-center min-h-screen px-4 transition-colors duration-700 ${
        darkMode
          ? "bg-gradient-to-br from-[#0e0e12] via-[#1a0b2e] to-[#2d0f4b] text-white"
          : "bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900"
      }`}
    >
      <div
        className={`rounded-2xl p-8 w-full max-w-sm text-center shadow-xl transition-all duration-500 hover:scale-[1.02] ${
          darkMode
            ? "bg-gray-900 border border-gray-800 shadow-indigo-900/30"
            : "bg-white border border-gray-100"
        }`}
      >
        {/* Icon */}
        <div
          className={`flex items-center justify-center mb-4 ${
            darkMode ? "text-indigo-400" : "text-indigo-600"
          }`}
        >
          <KeyRound size={36} />
        </div>

        {/* Heading */}
        <h2
          className={`text-2xl font-semibold mb-2 ${
            darkMode ? "text-gray-100" : "text-gray-800"
          }`}
        >
          Join a Room
        </h2>

        <p
          className={`text-sm mb-6 ${
            darkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Enter your 6-digit room code to get started.
        </p>

        {/* Input */}
        <input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="Enter 6-digit code"
          maxLength={6}
          className={`w-full px-4 py-3 text-center text-lg rounded-xl outline-none transition duration-300 border focus:ring-2 ${
            darkMode
              ? "bg-gray-800 text-white border-gray-700 placeholder-gray-500 focus:ring-indigo-500"
              : "bg-white text-gray-800 border-gray-300 focus:ring-indigo-500"
          }`}
        />

        {/* Button */}
        <button
          onClick={handleJoin}
          disabled={!roomCode || roomCode.length < 6}
          className={`mt-5 w-full font-medium py-3 rounded-xl transition duration-300 ${
            darkMode
              ? "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          Join Room
        </button>
      </div>
    </div>
  );
};

export default Lobby;
