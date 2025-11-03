import React, { useState } from "react";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const Navbar = () => {
  const { darkMode, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  console.log("dark", darkMode);
  

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold cursor-pointer">
              <span className="text-blue-500">Swing</span>
              <span className="text-gray-800 dark:text-gray-200">.Io</span>
            </h1>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-6 items-center">
            <button className="text-gray-800 dark:text-gray-200 hover:text-blue-500 transition">Home</button>
            <button className="text-gray-800 dark:text-gray-200 hover:text-blue-500 transition">About</button>
            <button className="text-gray-800 dark:text-gray-200 hover:text-blue-500 transition">Features</button>

            {/* Dark Mode Toggle */}
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center">
            <button onClick={toggleTheme} className="mr-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setMenuOpen((s) => !s)}>
              {menuOpen ? <X size={26} className="text-gray-800 dark:text-gray-200" /> : <Menu size={26} className="text-gray-800 dark:text-gray-200" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-700">
          <div className="px-4 py-3 space-y-2">
            <button className="block w-full text-left text-gray-800 dark:text-gray-200 hover:text-blue-500 transition">Home</button>
            <button className="block w-full text-left text-gray-800 dark:text-gray-200 hover:text-blue-500 transition">About</button>
            <button className="block w-full text-left text-gray-800 dark:text-gray-200 hover:text-blue-500 transition">Features</button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
