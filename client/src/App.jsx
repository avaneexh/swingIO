import { Routes, Route } from "react-router-dom";
import "./App.css";
import LobbyScreen from "./screens/Lobby";
import Room from "./screens/Room.jsx";
import Home from "./screens/Home.jsx";
import NotFound from "./screens/NotFound.jsx";
import Navbar from "./Components/Navbar.jsx";
import About from "./screens/About.jsx";
import Features from "./screens/Features.jsx";


function App() {
  return (
    <div className="App">
      <Navbar/>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby" element={<LobbyScreen />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="*" element={<NotFound/>} />
        <Route path="/404" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
