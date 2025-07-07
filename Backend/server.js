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
const recentMatchSet = new Set();
const MATCH_EXPIRY = 30 * 1000; // 1 minute
io.on("connection", (socket) => {
  console.log(socket.id);

  socket.on("start-connecting", () => {
   // availableSet.add(socket.id);
    console.log("step 2")
    makeMatchIfPossible(socket);
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

// const matchUser = (socket) => {
//   if (availableUsers.size > 1) {
//     for (const otherUserId of availableUsers) {
//       if (otherUserId !== socket.id) {
//         // Remove both users from available set
//         availableUsers.delete(socket.id);
//         availableUsers.delete(otherUserId);

//         const roomId = `${socket.id}-${otherUserId}`;
//         rooms.set(roomId, [socket.id, otherUserId]);

//         console.log("Matched:", socket.id, "<-->", otherUserId);

//         socket.emit("start-joining", {
//           roomId,
//           from: otherUserId,
//           me: socket.id,
//         });

//         io.to(otherUserId).emit("start-joining", {
//           roomId,
//           from: socket.id,
//           me: otherUserId,
//         });

//         break; // Important! Exit after pairing
//       }
//     }
//   } else {
//     console.log("No one available");
//   }
// };


function makeMatchIfPossible(socket) {
  // 1. Try waitingSet
  for (let user of waitingSet) {
    if (!isRecentlyMatched(user, socket.id)) {
      startMatch(user, socket.id);
      waitingSet.delete(user);
      return;
    }
  }

  // 2. Try availableSet
  for (let user of availableSet) {
    if (!isRecentlyMatched(user, socket.id)) {
      startMatch(user, socket.id);
      availableSet.delete(user);
      return;
    }
  }

  // 3. No match found
  availableSet.add(socket.id);
}

function startMatch(userA, userB) {
  const roomId = `${userA}-${userB}`;
  io.to(userA).emit("start-joining", { from: userB, roomId, me: userA });
  io.to(userB).emit("start-joining", { from: userA, roomId, me: userB });

  storeRecentMatch(userA, userB);
}

function storeRecentMatch(a, b) {
  const key1 = `${a}-${b}`;
  const key2 = `${b}-${a}`;
  recentMatchSet.add(key1);
  recentMatchSet.add(key2);

  setTimeout(() => {
    recentMatchSet.delete(key1);
    recentMatchSet.delete(key2);
  }, MATCH_EXPIRY);
}

function isRecentlyMatched(a, b) {
  return recentMatchSet.has(`${a}-${b}`) || recentMatchSet.has(`${b}-${a}`);
}



