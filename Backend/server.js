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
const availableSet = new Set();
const waitingSet = new Set();
const activeRooms = new Map();
const MATCH_EXPIRY = 30 * 1000; // 30 second

io.on("connection", (socket) => {
  //console.log(socket.id);
  io.emit("live-user", { liveUser: availableSet.size });
  socket.on("start-connecting", () => {
   
   // console.log("step 2");
   

    if (availableSet.has(socket.id)) return;

    availableSet.add(socket.id);

    io.emit("live-user", { liveUser: availableSet.size });
    makeMatchIfPossible(socket);
  });

  socket.on("next", ({ otherUserId }) => {
    if (otherUserId) {
      // Clean up active match
     // console.log("mai aaya");
      cleanUpMatch(socket.id, otherUserId);

      // Add both users to waiting queue
      // waitingSet.add(socket.id);
      // waitingSet.add(otherUserId);

      // Try matching socket.id now
      makeMatchIfPossible(socket);
      io.to(otherUserId).emit("clear-message");
      // Also try matching other user
      //console.log("h1");
      setTimeout(() => {
       // console.log("h2");
        const fakeSocket = { id: otherUserId };
       // console.log("yes push hua before", waitingSet.size);
        makeMatchIfPossible(fakeSocket);
       // console.log("yesh push hua after", waitingSet.size);
      }, 100); // Delay to prevent race condition
    } else {
      // No partner – user likely unmatched, still clicked "next"

      makeMatchIfPossible(socket);
    }
  });

  socket.on("stop", ({ otherUserId }) => {
    if (otherUserId) {
      availableSet.delete(socket.id);
      io.emit("live-user", { liveUser: availableSet.size });
      cleanUpMatch(socket.id, otherUserId);
      // io.to(otherUserId).emit("user-left", { roomId }); TODO add the tosat;
      // Remove from both sets
      waitingSet.delete(socket.id);

      io.to(otherUserId).emit("clear-message");

      setTimeout(() => {
        const fakeSocket = { id: otherUserId };

        makeMatchIfPossible(fakeSocket);
      }, 100);
    }
  });

  socket.on("video-muted", ({ otherUserId }) => {
    console.log("video muted",otherUserId)
    io.to(otherUserId).emit("video-muted");
  });

  socket.on("audio-muted", ({ otherUserId }) => {
    io.to(otherUserId).emit("audio-muted");
  });

  socket.on("send-message", ({ message, otherUserId, mySocketId }) => {
    io.to(otherUserId).emit("send-message", { message, mySocketId });
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
    //console.log("disconnected");
    availableSet.delete(socket.id);
    waitingSet.delete(socket.id);

    const otherUserId = activeRooms.get(socket.id);
    //console.log(otherUserId);
    io.to(otherUserId).emit("clear-message");
   
    io.emit("live-user", { liveUser: availableSet.size });
  });
});

function makeMatchIfPossible(socket) {
  // 1. Try waitingSet
  for (let user of waitingSet) {
    if (!isCurrentlyMatched(user, socket.id) && user != socket.id) {
     // console.log(`🔗 Matched in waithing: ${user} <--> ${socket.id}`);
      startMatch(user, socket.id);
     // console.log(waitingSet.size);
      waitingSet.delete(user);
      waitingSet.delete(socket.id);
      // availableSet.delete(user);
      // availableSet.delete(socket.id);
    //  console.log(waitingSet.size);
    //  console.log(`🔗 delete in waithing: ${user} <--> ${socket.id}`);
      return;
    }
  }

  // 2. Try availableSet
  // for (let user of availableSet) {
  //   if (!isCurrentlyMatched(user, socket.id) && user != socket.id) {
  //     console.log(`🔗 Matched in available: ${user} <--> ${socket.id}`);
  //     startMatch(user, socket.id);
  //     availableSet.delete(user);
  //     availableSet.delete(socket.id);
  //     waitingSet.delete(user);
  //     waitingSet.delete(socket.id);
  //     console.log(`🔗 delete in available: ${user} <--> ${socket.id}`);
  //     console.log(availableSet.size);
  //     console.log(waitingSet.size);
  //     return;
  //   }
  // }

  // 3. No match found
  waitingSet.add(socket.id);
}

function startMatch(userA, userB) {
  const roomId = `${userA}-${userB}`;

  // ✅ Track the active room
  activeRooms.set(userA, userB);
  activeRooms.set(userB, userA);

  io.to(userA).emit("start-joining", { from: userB, roomId, me: userA });
  io.to(userB).emit("start-joining", { from: userA, roomId, me: userB });
}

function cleanUpMatch(userA, userB) {
  setTimeout(() => {
    activeRooms.delete(userA);
    activeRooms.delete(userB);
  }, MATCH_EXPIRY);
}

function isCurrentlyMatched(a, b) {
  return activeRooms.get(a) === b || activeRooms.get(b) === a;
}
