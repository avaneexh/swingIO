// src/pages/Room.jsx
import React, { useEffect, useCallback, useState, useRef } from "react";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

const CHUNK_SIZE = 16 * 1024; // 16KB

const Room = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [fileProgress, setFileProgress] = useState(null); // progress state
  const isNegotiating = useRef(false);
  const incomingFileStore = useRef({}); // { filename: { chunks: [], mime } }

  // helper add tracks once
  const addLocalTracks = useCallback((stream) => {
    if (!stream) return;
    const pc = peer.getRTCPeerConnection();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  }, []);

  // Data channel
  const prepareCallerDataChannel = useCallback(() => {
    peer.createDataChannel("chat");
    peer.listenForDataChannel(handleDataMessage, handleDataOpen, handleDataClose);
  }, []);

  const handleDataOpen = useCallback(() => {
    console.log("Data channel open");
  }, []);

  const handleDataClose = useCallback(() => {
    console.log("Data channel closed");
  }, []);

  const handleDataMessage = useCallback(
    (raw) => {
      if (raw instanceof ArrayBuffer) {
        const keys = Object.keys(incomingFileStore.current);
        if (keys.length === 0) return;
        const filename = keys[0];
        incomingFileStore.current[filename].chunks.push(raw);

        // update progress for receiver
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
          incomingFileStore.current[parsed.name] = { chunks: [], mime: parsed.mime || "application/octet-stream", total: parsed.size };
          setChatLog((prev) => [...prev, { sender: "system", text: `Receiving file: ${parsed.name}` }]);
        } else if (parsed.type === "file-end") {
          const meta = incomingFileStore.current[parsed.name];
          if (!meta) return;
          const blob = new Blob(meta.chunks, { type: meta.mime });
          const url = URL.createObjectURL(blob);
          setChatLog((prev) => [
            ...prev,
            { sender: "remote-file", text: parsed.name, url, size: blob.size },
          ]);
          delete incomingFileStore.current[parsed.name];
          setFileProgress(null); // reset
        }
      } catch (err) {
        setChatLog((prev) => [...prev, { sender: "remote", text: String(raw) }]);
      }
    },
    []
  );

  // 1️⃣ Caller logic
  const handleUserJoined = useCallback(
    async ({ email, id }) => {
      setRemoteSocketId(id);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMyStream(stream);
      addLocalTracks(stream);

      prepareCallerDataChannel();

      const offer = await peer.getOffer();
      socket.emit("user:call", { to: id, offer });
    },
    [addLocalTracks, prepareCallerDataChannel, socket]
  );

  // 2️⃣ Callee logic
  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMyStream(stream);
      addLocalTracks(stream);

      peer.listenForDataChannel(handleDataMessage, handleDataOpen, handleDataClose);

      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [addLocalTracks, handleDataMessage, handleDataOpen, handleDataClose, socket]
  );

  const handleCallAccepted = useCallback(
    async ({ from, ans }) => {
      await peer.setRemoteDescriptionFromAnswer(ans);
    },
    []
  );

  // ICE
  useEffect(() => {
    const pc = peer.getRTCPeerConnection();
    pc.onicecandidate = (ev) => {
      if (ev.candidate && remoteSocketId) {
        socket.emit("ice-candidate", { to: remoteSocketId, candidate: ev.candidate });
      }
    };
    socket.on("ice-candidate", async ({ candidate }) => {
      if (!candidate) return;
      await peer.addIceCandidate(candidate);
    });
    return () => socket.off("ice-candidate");
  }, [socket, remoteSocketId]);

  // remote track
  useEffect(() => {
    const pc = peer.getRTCPeerConnection();
    const handler = (ev) => {
      const [stream] = ev.streams;
      if (stream) setRemoteStream(stream);
    };
    pc.addEventListener("track", handler);
    return () => pc.removeEventListener("track", handler);
  }, []);

  // negotiation
  const handleNegoNeeded = useCallback(async () => {
    if (isNegotiating.current) return;
    try {
      isNegotiating.current = true;
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

  // renegotiation
  useEffect(() => {
    socket.on("peer:nego:needed", async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    });
    socket.on("peer:nego:final", async ({ ans }) => {
      await peer.setRemoteDescriptionFromAnswer(ans);
    });
    return () => {
      socket.off("peer:nego:needed");
      socket.off("peer:nego:final");
    };
  }, [socket]);

  // core listeners
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

  // chat send
  const handleSendMessage = () => {
    if (!message.trim()) return;
    const payload = JSON.stringify({ type: "text", content: message });
    peer.sendMessage(payload);
    setChatLog((prev) => [...prev, { sender: "me", text: message }]);
    setMessage("");
  };

  // file send with progress
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

  return (
    <div style={{ padding: 16 }}>
      <h2>🎥 Room</h2>
      <div>
        <strong>Status:</strong>{" "}
        {remoteSocketId ? <span style={{ color: "green" }}>Connected</span> : <span>Waiting</span>}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <div>
          <h4>My Stream</h4>
          {myStream ? (
            <video playsInline muted autoPlay ref={(v) => v && (v.srcObject = myStream)} width={300} height={180} />
          ) : (
            <div style={{ width: 300, height: 180, background: "#222" }} />
          )}
        </div>

        <div>
          <h4>Remote Stream</h4>
          {remoteStream ? (
            <video playsInline autoPlay ref={(v) => v && (v.srcObject = remoteStream)} width={300} height={180} />
          ) : (
            <div style={{ width: 300, height: 180, background: "#222" }} />
          )}
        </div>
      </div>

      {/* chat + file log */}
      <div style={{ marginTop: 18 }}>
        <div style={{ border: "1px solid #ddd", height: 200, overflowY: "auto", padding: 8 }}>
          {chatLog.map((c, i) => {
            if (c.sender === "remote-file") {
              return (
                <div key={i}>
                  <div>File received: {c.text} ({c.size} bytes)</div>
                  <a href={c.url} download={c.text}>
                    Download {c.text}
                  </a>
                </div>
              );
            }
            return (
              <div key={i} style={{ textAlign: c.sender === "me" ? "right" : "left", margin: 4 }}>
                <span style={{ display: "inline-block", padding: 6, background: "#fff", borderRadius: 6, color: "black" }}>
                  {c.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* file progress */}
        {fileProgress && (
          <div style={{ marginTop: 8 }}>
            Sending {fileProgress.name}: {((fileProgress.sent / fileProgress.total) * 100).toFixed(1)}%
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, padding: 8 }}
          />
          <button onClick={handleSendMessage}>Send</button>
          <input type="file" onChange={handleFileSelect} />
        </div>
      </div>
    </div>
  );
};

export default Room;