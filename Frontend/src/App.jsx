import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'


import { useContext } from 'react';
import { SocketContext } from './Context/SocketProvider';
import { useEffect } from 'react';



function App() {
  const [socketID, setSocketID] = useState(null);
  const {socket}=useContext(SocketContext);


  socket.on('checking',(data)=>{
    setSocketID(data.socketId);
  })

  useEffect(()=>{
    socket.emit("checking","mai aa gya");
  },[])

  return (
    <>
     <h1>Your socket ID : {socketID}</h1>
    </>
  )
}

export default App
