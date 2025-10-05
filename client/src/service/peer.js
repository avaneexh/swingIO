class PeerService {
  constructor() {
    if (!this.peer) {
      this.peer = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      });
    }

    // dataChannel reference (caller will create it)
    this.dataChannel = null;

    // helper callbacks
    this.onDataMessage = () => {};
    this.onDataOpen = () => {};
    this.onDataClose = () => {};

    // expose peer events for outside if necessary
    this.peer.onconnectionstatechange = () => {
      // console.log("pc state:", this.peer.connectionState);
    };
  }

  // Caller uses this BEFORE creating offer
  createDataChannel(label = "chat") {
    if (this.dataChannel && this.dataChannel.readyState !== "closed") return this.dataChannel;

    this.dataChannel = this.peer.createDataChannel(label);
    this.dataChannel.binaryType = "arraybuffer";

    this.dataChannel.onopen = () => {
      this.onDataOpen();
    };
    this.dataChannel.onmessage = (ev) => {
      this.onDataMessage(ev.data);
    };
    this.dataChannel.onclose = () => {
      this.onDataClose();
    };

    return this.dataChannel;
  }

  // Receiver uses this to get incoming data channel
  listenForDataChannel(onMessageCallback, onOpenCallback, onCloseCallback) {
    this.onDataMessage = onMessageCallback || this.onDataMessage;
    this.onDataOpen = onOpenCallback || this.onDataOpen;
    this.onDataClose = onCloseCallback || this.onDataClose;

    this.peer.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.dataChannel.binaryType = "arraybuffer";

      this.dataChannel.onopen = () => this.onDataOpen();
      this.dataChannel.onmessage = (ev) => this.onDataMessage(ev.data);
      this.dataChannel.onclose = () => this.onDataClose();
    };
  }

  // Send message (string or ArrayBuffer)
  sendMessage(payload) {
    if (!this.dataChannel) {
      console.warn("DataChannel not established yet");
      return;
    }
    if (this.dataChannel.readyState !== "open") {
      console.warn("DataChannel is not open:", this.dataChannel.readyState);
      return;
    }
    this.dataChannel.send(payload);
  }

  // create offer & set local description
  async getOffer() {
    if (!this.peer) throw new Error("PeerConnection not initialized");
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    return offer;
  }

  // set remote offer, create answer, set local desc, return answer
  async getAnswer(offer) {
    if (!this.peer) throw new Error("PeerConnection not initialized");
    await this.peer.setRemoteDescription(offer);
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    return answer;
  }

  // when caller gets answer from remote -> set remote desc (answer)
  async setRemoteDescriptionFromAnswer(answer) {
    if (!this.peer) throw new Error("PeerConnection not initialized");
    await this.peer.setRemoteDescription(answer);
  }

  // convenience for adding ICE candidate
  async addIceCandidate(candidate) {
    if (!candidate) return;
    try {
      await this.peer.addIceCandidate(candidate);
    } catch (err) {
      console.error("peer.addIceCandidate error:", err);
    }
  }

  // Expose underlying peer if you need (e.g. events)
  getRTCPeerConnection() {
    return this.peer;
  }
}

export default new PeerService();
