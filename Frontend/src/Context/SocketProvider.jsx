import React, {  createContext, useMemo } from "react";
import io from 'socket.io-client'

export const SocketContext=createContext(null);
const server_url='http://localhost:1000'



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