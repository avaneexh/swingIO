import { useState } from 'react'
import {Routes, Route} from "react-router-dom"
import LobbyScreen from './screens/Lobby'


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Routes>
      <Route path = "/" element = {<LobbyScreen/>} />
    </Routes>
      
    </>
  )
}

export default App
