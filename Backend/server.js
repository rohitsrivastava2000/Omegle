import express from 'express'
import http from 'http'
import {Server} from 'socket.io'


const app=express();

const server=http.createServer(app);

const io=new Server(server);

app.get('/', (req, res) => {
  res.send("Server is Started");
});

server.listen('1000', () => {
  console.log(`✅ Server is running `);
});


//socket work
io.on('connection',(socket)=>{
    console.log(socket.id);

    socket.on('checking',(data)=>{
        socket.emit('checking',{socketId:socket.id});
    })

    socket.on('disconnecting',()=>{
            console.log("disconnected")
        })
})