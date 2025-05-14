import React, {useCallback, useState, useEffect } from 'react'
import { useSocket } from './../context/SocketProvider';






function LobbyScreen() {

    const [email, setEmail] = useState("");
    const [room, setroom] = useState("");


    const socket = useSocket()

    console.log(socket);
    


    const handleSubmitForm = useCallback((e) =>{
        e.preventDefault();
        console.log(email, room);

        socket.emit('room:join', {email, room});
        
    }, [email, room, socket]);

    const handleJoinRoom = useCallback((data) => {
        
    }, [])
 
    useEffect(()=>{
        socket.on('room:join', handleJoinRoom );
        return () => {
            socket.off("room:join", handleJoinRoom )
        }
    }, [socket, handleJoinRoom]);


    return (
    <>
    <div>

    <div>Lobby</div>
   <form onSubmit={handleSubmitForm}>
    <label htmlFor='email'>
        Email Id
    </label>
    <input type="email" id='email' value={email} onChange={e => setEmail(e.target.value) }/>
    <br/>
    <label htmlFor='room'>
        Room Id
    </label>
    <input type='text' id='room' value={room} onChange={e => setroom(e.target.value) }/>
    <br/>
    <button>Join</button>
   </form>
    </div>
    </>
  )
}

export default LobbyScreen;