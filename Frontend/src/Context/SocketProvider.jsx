import React, {  createContext, useMemo } from "react";
import io from 'socket.io-client'
const server_url=import.meta.env.VITE_API_URL;

export const SocketContext=createContext(null);
console.log(server_url);



export const SocketProvider=React.memo(({children})=>{
    const options={
        
        reconnectionAttempts:'Infinity',
        timeout: 10000,
        transports:['websocket'],
        secure:false
    }
    const socket=useMemo(()=>io.connect(server_url,options),[])

    const info={
        socket
    }
    return (
        <SocketContext.Provider value={info} >
            {children}
        </SocketContext.Provider>
    )
})