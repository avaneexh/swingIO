import React,{ useEffect, useCallback, useState }  from 'react'
import ReactPlayer from 'react-player'
import { useSocket } from '../context/SocketProvider'
import peer from '../service/peer'

const RoomPage = () => {

  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();


  const handleIncomingCall = useCallback(async({from, offer}) => {

    setRemoteSocketId(from)
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio:true, 
      video:true
    })
    setMyStream(stream);
    console.log("Incoming call from ", from, offer );
    const ans = await peer.getAnswer(offer)

    socket.emit('call:accepted',{to : from, ans})

    
  },[socket]);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback( async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio:true, 
      video:true
    })
    const offer = await peer.getOffer();
    socket.emit("user:call", {to: remoteSocketId, offer})
    setMyStream(stream);
  },[remoteSocketId, socket])

const sendStreams = useCallback(() => {
  if (!myStream) {
    console.warn("myStream not ready yet");
    return;
  }
  for (const track of myStream.getTracks()) {
    peer.peer.addTrack(track, myStream);
  }
}, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );


  const handleNegoNeeded = useCallback( async () => {
      const offer = await peer.getOffer();
      socket.emit('peer:nego:needed', { offer, to: remoteSocketId})
    }, [remoteSocketId, socket]);


  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);


  const handleNegoNeedIncoming = useCallback(async (from, offer) => {
    const ans = await peer.getAnswer(offer);
    socket.emit('peer:nego:done', {to: from, ans })
  },[socket])


  const handleNegoFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  },[])



  useEffect(() => {
    peer.peer.addEventListener('track', async ev => {
      const remoteStream = ev.streams
      setMyStream(remoteStream[0]);
    })
  },[])




  useEffect(() => {

     socket.on("user:joined", handleUserJoined);
     socket.on("incoming:call", handleIncomingCall);
     socket.on("call:accepted", handleCallAccepted);
     socket.on('peer.nego.needed', handleNegoNeedIncoming);
     socket.on('peer:nego:final', handleNegoFinal )
     

    return() => {
      socket.off("user:joined", handleUserJoined );
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off('peer.nego.needed', handleNegoNeedIncoming);
      socket.off('peer:nego:final', handleNegoFinal )
    }

  }, [  socket,
    handleUserJoined, 
    handleIncomingCall,
  
  ])


  return (
    <div>
      <h1>  
      Room Page
      </h1>
    <h4>
      {remoteSocketId ? 'connected' : 'No user Connected'}
    </h4>
      {
    myStream && 
    <button onClick={sendStreams}>
      Send My stream
    </button>
   }
   

   {
    remoteSocketId && 
    <button onClick={handleCallUser}>
      CALL
    </button>
   }
   
 

    {myStream && (
        <>
          <h1>My Stream</h1>
          <ReactPlayer
            playing
            muted
            height="100px"
            width="200px"
            url={myStream}
          />
        </>
      )}
    {remoteStream && (
        <>
          <h1>Remote Stream</h1>
          <ReactPlayer
            playing
            muted
            height="100px"
            width="200px"
            url={remoteStream}
          />
        </>
      )}
    </div>
  )
}

export default RoomPage