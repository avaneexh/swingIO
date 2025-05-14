import React,{ useEffect, useCallback, useState }  from 'react'
import { useSocket } from '../context/SocketProvider'

const RoomPage = () => {

  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState("");


  const handleuserJoined = useCallback((email, id) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, [])


  useEffect(() => {

    socket.on('user:joined', handleuserJoined)

    return() => {
      socket.off('user:joined', handleuserJoined )
    }

  }, [ socket, handleuserJoined ])


  return (
    <div>
      <h1>  
      Room Page
      </h1>
    <h4>
      {remoteSocketId ? 'connected' : 'No user Connected'}
    </h4>
    </div>
  )
}

export default RoomPage