import React, {useCallback, useState} from 'react'





function LobbyScreen() {

    const [email, setEmail] = useState("");
    const [room, setroom] = useState("");

    const handleSubmitForm = useCallback((e) =>{
        e.preventDefault();
        console.log(email, room);
        
    }, [])
 
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