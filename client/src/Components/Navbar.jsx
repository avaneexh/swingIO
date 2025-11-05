import React, { useState } from "react";
import { Moon, Sun, Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const Navbar = () => {
  const { darkMode, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className={`fixed w-full z-50 transition-colors duration-500 shadow-md ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center">
            <NavLink to="/" onClick={() => setMenuOpen(false)}>
              <h1 className="text-2xl font-bold cursor-pointer tracking-wide hover:scale-105 transition-transform">
                <span className="text-blue-500">Swing</span>
                <span
                  className={`${
                    darkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  .Io
                </span>
              </h1>
            </NavLink>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8 items-center">
            {["Home", "About", "Features"].map((item) => {
              const path =
                item === "Home"
                  ? "/"
                  : `/${item.toLowerCase()}`; // e.g. /about, /features
              return (
                <NavLink
                  key={item}
                  to={path}
                  className={({ isActive }) =>
                    `transition-colors duration-300 font-medium ${
                      darkMode
                        ? isActive
                          ? "text-blue-400"
                          : "text-gray-300 hover:text-blue-400"
                        : isActive
                        ? "text-blue-600"
                        : "text-gray-800 hover:text-blue-600"
                    }`
                  }
                >
                  {item}
                </NavLink>
              );
            })}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all duration-300 ${
                darkMode
                  ? "hover:bg-gray-800 text-yellow-400"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleTheme}
              className={`mr-3 p-2 rounded-full transition-all duration-300 ${
                darkMode
                  ? "hover:bg-gray-800 text-yellow-400"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="transition-transform hover:scale-110"
            >
              {menuOpen ? (
                <X
                  size={26}
                  className={`${
                    darkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                />
              ) : (
                <Menu
                  size={26}
                  className={`${
                    darkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div
          className={`md:hidden transition-all duration-300 border-t ${
            darkMode
              ? "bg-gray-900 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="px-4 py-3 space-y-2">
            {["Home", "About", "Features"].map((item) => {
              const path =
                item === "Home"
                  ? "/"
                  : `/${item.toLowerCase()}`;
              return (
                <NavLink
                  key={item}
                  to={path}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block w-full text-left font-medium transition-colors duration-300 ${
                      darkMode
                        ? isActive
                          ? "text-blue-400"
                          : "text-gray-300 hover:text-blue-400"
                        : isActive
                        ? "text-blue-600"
                        : "text-gray-800 hover:text-blue-600"
                    }`
                  }
                >
                  {item}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
