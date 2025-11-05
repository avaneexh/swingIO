import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSocket } from "../context/SocketProvider";
import { useTheme } from "../context/ThemeContext";

const Home = () => {
  const navigate = useNavigate();
  const socket = useSocket();
  const { darkMode } = useTheme();

  const backgroundGradient = darkMode
    ? "bg-gradient-to-b from-[#0e0e12] to-[#1a0b2e]"
    : "bg-gradient-to-b from-[#f9fafb] to-[#e5e7eb]";

  const textColor = darkMode ? "text-white" : "text-gray-900";

  // For parallax balls
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: e.clientX - window.innerWidth / 2,
        y: e.clientY - window.innerHeight / 2,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const generateRoomCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreateRoom = () => {
    const roomCode = generateRoomCode();
    socket.emit("create-room", { roomCode });
    navigate(`/room/${roomCode}`);
  };

  const handleJoinRoom = () => {
    navigate("/lobby");
  };

  return (
  <>
      <div
        className={`relative flex flex-col items-center justify-center h-screen overflow-hidden transition-colors duration-700 ${backgroundGradient} ${textColor}`}
      >
        {[
          { size: 80, color: "bg-pink-500", x: -200, y: -150 },
          { size: 120, color: "bg-blue-500", x: 250, y: -100 },
          { size: 60, color: "bg-purple-500", x: -100, y: 200 },
          { size: 100, color: "bg-emerald-500", x: 200, y: 250 },
        ].map((ball, idx) => (
          <motion.div
            key={idx}
            className={`absolute rounded-full ${ball.color} ${
              darkMode ? "opacity-70 blur-2xl" : "opacity-60 blur-xl"
            }`}
            style={{
              width: ball.size,
              height: ball.size,
              left: `calc(50% + ${ball.x}px)`,
              top: `calc(50% + ${ball.y}px)`,
            }}
            animate={{
              x: mousePos.x * 0.05 * (idx % 2 === 0 ? 1 : -1),
              y: mousePos.y * 0.05 * (idx % 2 === 0 ? 1 : -1),
            }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          />
        ))}

        {/* Hero Text */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="z-10 text-center max-w-2xl px-4"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
            Explore the Possibilities of{" "}
            <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
              SwingIO
            </span>
          </h1>
          <p
            className={`mt-4 text-lg ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            Unleash seamless file sharing — powered by real-time technology.
          </p>
        </motion.div>

        {/* Floating Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="z-10 mt-8 flex flex-col sm:flex-row gap-4"
        >
          <motion.button
            whileHover={{ y: -5, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateRoom}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-shadow"
          >
            Create Room
          </motion.button>

          <motion.button
            whileHover={{ y: -5, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleJoinRoom}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl transition-shadow"
          >
            Join Room
          </motion.button>
        </motion.div>
      </div>
    </>
  );
};

export default Home;
