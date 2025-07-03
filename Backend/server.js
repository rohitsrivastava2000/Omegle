import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();

const server = http.createServer(app);

const io = new Server(server);

app.get("/", (req, res) => {
  res.send("Server is Started");
});

server.listen("1000", () => {
  console.log(`✅ Server is running `);
});

//socket work
const rooms = new Map();
const availableUsers = new Set();
io.on("connection", (socket) => {
  console.log(socket.id);

  socket.on("start-connecting", () => {
    availableUsers.add(socket.id);
    console.log("step 2")
    matchUser(socket);
  });

  socket.on("offer", (data) => {
    const { offer, roomId, to } = data;
    io.to(to).emit("offer", { offer, from: socket.id, roomId });
  });

  socket.on("answer", (data) => {
    const { answer, to } = data;
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", (data) => {
    const { candidate, to } = data;
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("disconnecting", () => {
    console.log("disconnected");
  });
});

const matchUser = (socket) => {
  if (availableUsers.size > 1) {
    for (const otherUserId of availableUsers) {
      if (otherUserId !== socket.id) {
        // Remove both users from available set
        availableUsers.delete(socket.id);
        availableUsers.delete(otherUserId);

        const roomId = `${socket.id}-${otherUserId}`;
        rooms.set(roomId, [socket.id, otherUserId]);

        console.log("Matched:", socket.id, "<-->", otherUserId);

        socket.emit("start-joining", {
          roomId,
          from: otherUserId,
          me: socket.id,
        });

        io.to(otherUserId).emit("start-joining", {
          roomId,
          from: socket.id,
          me: otherUserId,
        });

        break; // Important! Exit after pairing
      }
    }
  } else {
    console.log("No one available");
  }
};



