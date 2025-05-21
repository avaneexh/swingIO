import React,{ useEffect, useCallback, useState }  from 'react'
import ReactPlayer from 'react-player'
import { useSocket } from '../context/SocketProvider'

const RoomPage = () => {

  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();



  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback( async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio:true, 
      video:true
    })
    setMyStream(stream);
  },[])


  useEffect(() => {

     socket.on("user:joined", handleUserJoined);

    return() => {
      socket.off("user:joined", handleUserJoined );
    }

  }, [  socket,
    handleUserJoined, ])


  return (
    <div>
      <h1>  
      Room Page
      </h1>
    <h4>
      {remoteSocketId ? 'connected' : 'No user Connected'}
    </h4>
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
    </div>
  )
}

export default RoomPage