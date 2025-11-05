import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

const Features = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { darkMode } = useTheme();

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      className={`relative flex flex-col items-center justify-center h-screen overflow-hidden transition-colors duration-700 ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      {/* Animated Background Lights */}
      <motion.div
        className={`absolute w-[320px] h-[320px] rounded-full blur-3xl opacity-25 ${
          darkMode ? "bg-indigo-600" : "bg-indigo-400"
        }`}
        animate={{
          x: (mousePos.x - 0.5) * 100,
          y: (mousePos.y - 0.5) * 100,
        }}
        transition={{ type: "spring", stiffness: 30, damping: 20 }}
      />
      <motion.div
        className={`absolute w-[200px] h-[200px] rounded-full blur-3xl opacity-25 ${
          darkMode ? "bg-pink-500" : "bg-pink-300"
        }`}
        animate={{
          x: (mousePos.x - 0.5) * -100,
          y: (mousePos.y - 0.5) * -90,
        }}
        transition={{ type: "spring", stiffness: 30, damping: 20 }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight mb-4">
          Features
        </h1>
        <p
          className={`text-lg sm:text-xl font-medium ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          We’re adding incredible features to{" "}
          <span className="text-blue-500 font-semibold">Swing.Io</span> 💫
        </p>
        <p
          className={`mt-3 text-base sm:text-lg ${
            darkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          This page is still under development. Check back soon to explore all
          the magic!
        </p>

        <a
          href="/"
          className={`mt-8 inline-block px-8 py-3 rounded-2xl font-semibold shadow-md transition-all duration-300 ${
            darkMode
              ? "bg-white text-gray-900 hover:bg-gray-200"
              : "bg-gray-900 text-white hover:bg-gray-700"
          }`}
        >
          Go Home
        </a>
      </div>
    </div>
  );
};

export default Features;
