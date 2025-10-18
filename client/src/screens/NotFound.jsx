import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const [isDark, setIsDark] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  // Mouse parallax movement
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (location.pathname === "/404") {
        navigate("/", { replace: true });
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [location.pathname, navigate]);




  return (
    <div
      className={`flex flex-col items-center justify-center h-screen overflow-hidden transition-colors duration-500 ${
        isDark ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      {/* Theme toggle button */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="absolute top-6 right-6 p-3 rounded-full bg-opacity-20 backdrop-blur-lg border border-gray-500 transition hover:scale-105"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Parallax layers */}
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full bg-purple-600 opacity-20 blur-3xl"
        animate={{
          x: (mousePos.x - 0.5) * 100,
          y: (mousePos.y - 0.5) * 100,
        }}
        transition={{ type: "spring", stiffness: 30 }}
      />
      <motion.div
        className="absolute w-[200px] h-[200px] rounded-full bg-blue-500 opacity-20 blur-3xl"
        animate={{
          x: (mousePos.x - 0.5) * -120,
          y: (mousePos.y - 0.5) * -100,
        }}
        transition={{ type: "spring", stiffness: 30 }}
      />

      {/* Content */}
      <div className="relative text-center z-10 px-4">
        <h1 className="text-8xl font-extrabold tracking-tight">404</h1>
        <p className="mt-4 text-2xl font-medium">Page Not Found</p>
        <p className="mt-2 text-gray-400">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <a
          href="/"
          className={`mt-6 inline-block px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
            isDark
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

export default NotFound;
