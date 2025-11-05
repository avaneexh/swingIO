import React, { useEffect, useCallback, useState, useRef } from "react";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import { useParams } from "react-router-dom";
import { Copy, Send, Paperclip, ArrowDown  } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";



const CHUNK_SIZE = 16 * 1024; 

const Room = () => {
  const { roomId } = useParams(); 
  const socket = useSocket();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const chatContainerRef = useRef(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [fileProgress, setFileProgress] = useState(null);

  const isNegotiating = useRef(false);
  const incomingFileStore = useRef({});
  const pendingCandidates = useRef([]); 
  const remoteDescriptionSet = useRef(false); 

  // Add local media tracks
  const addLocalTracks = useCallback((stream) => {
    if (!stream) return;
    const pc = peer.getRTCPeerConnection();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }, []);

  // Data Channel
  const handleDataOpen = useCallback(() => console.log("Data channel open"), []);
  const handleDataClose = useCallback(() => console.log("Data channel closed"), []);

  const handleDataMessage = useCallback((raw) => {
    if (raw instanceof ArrayBuffer) {
      const keys = Object.keys(incomingFileStore.current);
      if (keys.length === 0) return;
      const filename = keys[0];
      incomingFileStore.current[filename].chunks.push(raw);
      const total = incomingFileStore.current[filename].total || 0;
      const received = incomingFileStore.current[filename].chunks.reduce((acc, c) => acc + c.byteLength, 0);
      setFileProgress({ name: filename, sent: received, total });
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed.type === "text") {
        setChatLog((prev) => [...prev, { sender: "remote", text: parsed.content }]);
      } else if (parsed.type === "file-meta") {
        incomingFileStore.current[parsed.name] = {
          chunks: [],
          mime: parsed.mime || "application/octet-stream",
          total: parsed.size,
        };
        setChatLog((prev) => [...prev, { sender: "system", text: `Receiving file: ${parsed.name}` }]);
      } else if (parsed.type === "file-end") {
        const meta = incomingFileStore.current[parsed.name];
        if (!meta) return;
        const blob = new Blob(meta.chunks, { type: meta.mime });
        const url = URL.createObjectURL(blob);
        setChatLog((prev) => [...prev, { sender: "remote-file", text: parsed.name, url, size: blob.size }]);
        delete incomingFileStore.current[parsed.name];
        setFileProgress(null);
      }
    } catch {
      setChatLog((prev) => [...prev, { sender: "remote", text: String(raw) }]);
    }
  }, []);

  const prepareCallerDataChannel = useCallback(() => {
    peer.createDataChannel("chat");
    peer.listenForDataChannel(handleDataMessage, handleDataOpen, handleDataClose);
  }, [handleDataMessage, handleDataOpen, handleDataClose]);

  // === 1️⃣ Caller
  const handleUserJoined = useCallback(async ({ id }) => {
    setRemoteSocketId(id);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setMyStream(stream);
    addLocalTracks(stream);
    prepareCallerDataChannel();

    const offer = await peer.getOffer();
    socket.emit("user:call", { to: id, offer });
  }, [addLocalTracks, prepareCallerDataChannel, socket]);

  // === 2️⃣ Callee
  const handleIncomingCall = useCallback(async ({ from, offer }) => {
    setRemoteSocketId(from);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setMyStream(stream);
    addLocalTracks(stream);
    peer.listenForDataChannel(handleDataMessage, handleDataOpen, handleDataClose);

    const ans = await peer.getAnswer(offer);
    socket.emit("call:accepted", { to: from, ans });
    remoteDescriptionSet.current = true;
    flushPendingCandidates();
  }, [addLocalTracks, handleDataMessage, handleDataOpen, handleDataClose, socket]);

  // === Handle Call Accepted
  const handleCallAccepted = useCallback(async ({ ans }) => {
    await peer.setRemoteDescriptionFromAnswer(ans);
    remoteDescriptionSet.current = true; 
    flushPendingCandidates();
  }, []);

  // === ICE Candidate Handling with Buffer ===
  const flushPendingCandidates = async () => {
    const pc = peer.getRTCPeerConnection();
    while (pendingCandidates.current.length > 0) {
      const candidate = pendingCandidates.current.shift();
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.error("Failed to flush candidate", e);
      }
    }
  };

  useEffect(() => {
    const pc = peer.getRTCPeerConnection();
    pc.onicecandidate = (ev) => {
      if (ev.candidate && remoteSocketId) {
        socket.emit("ice-candidate", { to: remoteSocketId, candidate: ev.candidate });
      }
    };

    socket.on("ice-candidate", async ({ candidate }) => {
      if (!candidate) return;
      if (remoteDescriptionSet.current) {
        try {
          await peer.addIceCandidate(candidate);
        } catch (e) {
          console.error("Error adding ICE candidate", e);
        }
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    return () => socket.off("ice-candidate");
  }, [socket, remoteSocketId]);

  // === Remote stream
  useEffect(() => {
    const pc = peer.getRTCPeerConnection();
    const handler = (ev) => {
      const [stream] = ev.streams;
      if (stream) setRemoteStream(stream);
    };
    pc.addEventListener("track", handler);
    return () => pc.removeEventListener("track", handler);
  }, []);

  // === Negotiation
  const handleNegoNeeded = useCallback(async () => {
    if (isNegotiating.current) return;
    isNegotiating.current = true;

    try {
      const pc = peer.getRTCPeerConnection();

      // ✅ Wait for signaling state to stabilize (important for Safari/Edge)
      if (pc.signalingState !== "stable") {
        await new Promise((resolve) => {
          const check = setInterval(() => {
            if (pc.signalingState === "stable") {
              clearInterval(check);
              resolve();
            }
          }, 100);
        });
      }

      // ✅ Create a fresh offer safely (rollback already handled inside getOffer)
      const offer = await peer.getOffer();

      socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
    } catch (err) {
      console.error("Negotiation error:", err);
    } finally {
      isNegotiating.current = false;
    }
  }, [remoteSocketId, socket]);


  useEffect(() => {
    const pc = peer.getRTCPeerConnection();
    pc.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => pc.removeEventListener("negotiationneeded", handleNegoNeeded);
  }, [handleNegoNeeded]);

  useEffect(() => {
    socket.on("peer:nego:needed", async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    });
    socket.on("peer:nego:final", async ({ ans }) => {
      await peer.setRemoteDescriptionFromAnswer(ans);
      remoteDescriptionSet.current = true;
      flushPendingCandidates();
    });
    return () => {
      socket.off("peer:nego:needed");
      socket.off("peer:nego:final");
    };
  }, [socket]);

  // === Socket Core
  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    return () => {
      socket.off("user:joined");
      socket.off("incomming:call");
      socket.off("call:accepted");
    };
  }, [socket, handleUserJoined, handleIncomingCall, handleCallAccepted]);

  // === Chat & File Send
  const handleSendMessage = () => {
    if (!message.trim()) return;
    peer.sendMessage(JSON.stringify({ type: "text", content: message }));
    setChatLog((prev) => [...prev, { sender: "me", text: message }]);
    setMessage("");
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    peer.sendMessage(JSON.stringify({ type: "file-meta", name: file.name, mime: file.type, size: file.size }));
    setFileProgress({ name: file.name, sent: 0, total: file.size });

    let offset = 0;
    while (offset < file.size) {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const ab = await slice.arrayBuffer();
      peer.sendMessage(ab);
      offset += CHUNK_SIZE;
      setFileProgress({ name: file.name, sent: offset, total: file.size });
    }

    peer.sendMessage(JSON.stringify({ type: "file-end", name: file.name }));
    setChatLog((prev) => [...prev, { sender: "me", text: `Sent file: ${file.name}` }]);
    setFileProgress(null);
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomId)
      .then(() => {
        console.log("Room code copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy room code: ", err);
      });
  };

  useEffect(() => {
    if (!isScrolledUp) {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatLog, fileProgress]);

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    setIsScrolledUp(!atBottom);
  };

  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
    setIsScrolledUp(false);
  };

  

  return (
    <div
      className={`h-screen flex flex-col items-center p-6 transition-colors duration-700 pt-16  ${
        darkMode
          ? "bg-gradient-to-br from-[#0e0e12] via-[#1a0b2e] to-[#2d0f4b] text-gray-100"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Header */}
      <div
        className={`w-full max-w-2xl rounded-2xl p-4 flex items-center justify-between shadow transition-all duration-500 ${
          darkMode ? "bg-gray-900 border border-gray-800" : "bg-white"
        }`}
      >
        <div>
          <h2
            className={`text-xl font-semibold flex items-center gap-2 ${
              darkMode ? "text-gray-100" : "text-gray-800"
            }`}
          >
            📌 Room Code:
            <span
              className={`font-mono ${
                darkMode ? "text-indigo-400" : "text-indigo-600"
              }`}
            >
              {roomId}
            </span>
          </h2>
        </div>

        {!remoteSocketId && (
          <button
            onClick={handleCopyRoomCode}
            className={`p-2 rounded-full transition ${
              darkMode
                ? "hover:bg-gray-800 text-gray-300"
                : "hover:bg-gray-200 text-gray-700"
            }`}
            title="Copy Room Code"
          >
            <Copy size={20} />
          </button>
        )}
      </div>

      {/* Connection Status */}
      <div
        className={`mt-3 ${
          darkMode ? "text-gray-400" : "text-gray-600"
        } transition-colors`}
      >
        <strong>Status:</strong>{" "}
        {remoteSocketId ? (
          <span className="text-green-500 font-medium">Connected</span>
        ) : (
          <span className="text-yellow-500 font-medium">Waiting...</span>
        )}
      </div>

      {/* Chat Section */}
      <div
        className={`w-full max-w-2xl rounded-2xl shadow mt-6 flex flex-col h-[500px] overflow-hidden transition-colors duration-500 ${
          darkMode
            ? "bg-gray-900 border border-gray-800"
            : "bg-white border border-gray-200"
        }`}
      >
      {/* Chat Box */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto p-4 space-y-2 transition-colors relative ${
          darkMode ? "bg-gray-950" : "bg-gray-100"
        } scrollbar-hide`}
      >
        {chatLog.map((c, i) => {
          if (c.sender === "remote-file") {
            return (
              <div key={i} className="flex justify-start">
                <div
                  className={`p-3 rounded-lg shadow-sm border text-sm max-w-[80%] ${
                    darkMode
                      ? "bg-gray-800 border-gray-700 text-gray-200"
                      : "bg-white border-gray-200 text-gray-800"
                  }`}
                >
                  <div className="font-medium">📎 {c.text}</div>
                  <a
                    href={c.url}
                    download={c.text}
                    className={`text-xs underline mt-1 inline-block ${
                      darkMode ? "text-indigo-400" : "text-indigo-600"
                    }`}
                  >
                    Download File ({(c.size / 1024).toFixed(1)} KB)
                  </a>
                </div>
              </div>
            );
          }

          if (c.sender === "me-file") {
            return (
              <div key={i} className="flex justify-end">
                <div className="bg-indigo-500 text-white p-3 rounded-lg shadow-sm max-w-[80%] flex items-center gap-2">
                  <div>📎 {c.text}</div>
                  {fileProgress && fileProgress.name === c.text && (
                    <div className="relative w-5 h-5">
                      <div className="absolute inset-0 border-2 border-white/50 rounded-full"></div>
                      <div
                        className="absolute inset-0 border-2 border-white rounded-full"
                        style={{
                          clipPath: `inset(${
                            100 -
                            (fileProgress.sent / fileProgress.total) * 100
                          }% 0 0 0)`,
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`flex ${
                c.sender === "me" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 rounded-lg shadow-sm max-w-[75%] ${
                  c.sender === "me"
                    ? "bg-indigo-500 text-white"
                    : darkMode
                    ? "bg-gray-800 text-gray-100"
                    : "bg-white text-gray-800"
                }`}
              >
                {c.text}
              </div>
            </div>
          );
        })}

        {/* Scroll to Bottom Button */}
        {isScrolledUp && (
          <button
            onClick={scrollToBottom}
            className={`absolute bottom-3 left-1/2 -translate-x-1/2 p-2 rounded-full shadow-md transition-all duration-300 ${
              darkMode
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-indigo-500 hover:bg-indigo-600 text-white"
            }`}
          >
            <ArrowDown size={20} />
          </button>
        )}

      </div>

      {/* Message Input */}
      <div
        className={`p-3 border-t flex items-center gap-3 transition-colors duration-500 ${
          darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}
      >
        <label
          className={`p-2 rounded-full cursor-pointer transition ${
            darkMode ? "hover:bg-gray-800" : "hover:bg-gray-200"
          }`}
        >
          <Paperclip size={20} />
          <input type="file" onChange={handleFileSelect} className="hidden" />
        </label>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              // e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type a message..."
          className={`flex-1 rounded-full px-4 py-2 focus:outline-none focus:ring-2 text-sm sm:text-base transition duration-300 ${
            darkMode
              ? "bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:ring-indigo-500"
              : "bg-white text-gray-800 border border-gray-300 focus:ring-indigo-500"
          }`}
        />
        <button
          onClick={handleSendMessage}
          className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 transition"
        >
          <Send size={20} />
        </button>
      </div>
    </div>

      {/* File Upload Progress */}
      {fileProgress && (
        <div
          className={`mt-4 text-sm transition-colors ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Sending <strong>{fileProgress.name}</strong>:{" "}
          {((fileProgress.sent / fileProgress.total) * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
};

export default Room;
