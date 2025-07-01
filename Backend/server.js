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
const rooms = new Map();
const availableUsers = new Set();
io.on('connection',(socket)=>{
    console.log(socket.id);

    socket.on('start-connecting',()=>{
        availableUsers.add(socket.id);

        matchUser(socket);
    })

    socket.on('disconnecting',()=>{
            console.log("disconnected")
        })
})


const matchUser=(socket)=>{
  if(availableUsers.size>1){
    for(const otherUserId of availableUsers){
      if(otherUserId!=socket.id){
        const roomId = `${socket.id}-${otherUserId}`;
        rooms.set(roomId, [socket.id, otherUserId]);
        socket.emit('start-joining',{roomId,}) //TODO Start code on here
      }
    }
  }
}