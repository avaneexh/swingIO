import React, { useEffect, useCallback, useState, useRef } from "react";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import { useParams } from "react-router-dom";
import { Copy, Send, Paperclip, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";


const CHUNK_SIZE = 16 * 1024; // 16KB

const Room = () => {
  const { roomId } = useParams(); 
  const socket = useSocket();
  const navigate = useNavigate();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [fileProgress, setFileProgress] = useState(null);

  const isNegotiating = useRef(false);
  const incomingFileStore = useRef({});
  const pendingCandidates = useRef([]); // ✅ store ICE candidates temporarily
  const remoteDescriptionSet = useRef(false); // ✅ flag for ICE handling

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
    remoteDescriptionSet.current = true; // ✅ mark after setRemoteDescription
    // flush buffered candidates
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
      const offer = await peer.getOffer();
      socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
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


  // === UI
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      {/* Header */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            📌 Room Code:
            <span className="font-mono text-indigo-600">{roomId}</span>
          </h2>
        </div>
        <button
          onClick={handleCopyRoomCode}
          className="p-2 rounded-full hover:bg-gray-200 transition"
          title="Copy Room Code"
        >
          <Copy size={20} />
        </button>
      </div>

      {/* Connection Status */}
      <div className="mt-3 text-gray-600">
        <strong>Status:</strong>{" "}
        {remoteSocketId ? (
          <span className="text-green-600 font-medium">Connected</span>
        ) : (
          <span className="text-yellow-600 font-medium">Waiting...</span>
        )}
      </div>

      {/* Chat Section */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow mt-6 flex flex-col h-[500px] overflow-hidden">
        {/* Chat Box */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-100">
          {chatLog.map((c, i) => {
            if (c.sender === "remote-file") {
              return (
                <div key={i} className="flex justify-start">
                  <div className="bg-white p-3 rounded-lg shadow-sm border text-sm max-w-[80%]">
                    <div className="font-medium text-gray-800">
                      📎 {c.text}
                    </div>
                    <a
                      href={c.url}
                      download={c.text}
                      className="text-indigo-600 text-xs underline mt-1 inline-block"
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
                            clipPath: `inset(${100 - (fileProgress.sent / fileProgress.total) * 100}% 0 0 0)`,
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
                className={`flex ${c.sender === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`${
                    c.sender === "me"
                      ? "bg-indigo-500 text-white"
                      : "bg-white text-gray-800"
                  } p-3 rounded-lg shadow-sm max-w-[75%]`}
                >
                  {c.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input */}
        <div className="p-3 border-t bg-white flex items-center gap-3">
          <label className="p-2 rounded-full hover:bg-gray-200 cursor-pointer">
            <Paperclip size={20} />
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
          />
          <button
            onClick={handleSendMessage}
            className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 transition"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* File Upload Progress (optional separate display) */}
      {fileProgress && (
        <div className="mt-4 text-sm text-gray-600">
          Sending <strong>{fileProgress.name}</strong>:{" "}
          {((fileProgress.sent / fileProgress.total) * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
};

export default Room;
