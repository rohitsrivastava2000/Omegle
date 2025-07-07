import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../Context/SocketProvider";
import PeerService from "../Service/peer";

function Room() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isFinding, setIsFinding] = useState(false);
  const [mySocketId,setMySocketId]=useState("");
  const [friendSocketId,setFriendSocketId]=useState("");
  const [nextProcessing,setNextProcessing]=useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerInstance = useRef(null);

  const { socket } = useContext(SocketContext);

  useEffect(() => {
    const getPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setLocalStream(stream);
        console.log(stream);
      } catch (error) {
        // TODO adding the toast
        if (error.name === "NotAllowedError") {
          // toast.error("Camera/Mic Permission Denied.");
          console.warn("Permissions denied for camera/microphone.");
        } else if (error.name === "NotFoundError") {
          // toast.error("No Camera/Mic Found.");
          console.warn("No camera/microphone found.");
        }
      }
    };

    getPermission();

    return () => {
      if (localStream) {
        // console.log("cleaning up local stream");
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // seting local video stream to video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      // console.log("Assigning local stream to video element");
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set remote stream to video element
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      // console.log("Remote stream set on video element via useEffect");
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!localStream || !peerInstance.current) return;

    // console.log("Adding tracks to peer connection");
    addTracksInOrder(peerInstance.current.peer, localStream);
  }, [localStream]);

  const addTracksInOrder = (pc, stream) => {
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    // Add audio first
    audioTracks.forEach((track) => pc.addTrack(track, stream));
    // Then video
    videoTracks.forEach((track) => pc.addTrack(track, stream));
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("start-joining", async ({ roomId, from, me }) => {
      setIsFinding(false);
      setFriendSocketId(from);
      setMySocketId(me);
      console.log("MysocketId",mySocketId);
      console.log("FriendSocketId",friendSocketId);
      if (!localStream) {
        console.warn("Local stream not ready yet!");
        return;
      }
      if (!peerInstance.current) {
        peerInstance.current = new PeerService();
      }

      const pc = peerInstance.current.peer;

      if (pc.getSenders().length === 0) {
        addTracksInOrder(pc, localStream);
      }
      // Setup handlers
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            to: from,
          });
        }
      };

      if (socket.id < from) {
        const offer = await peerInstance.current.getOffer();
        socket.emit("offer", { offer, roomId, to: from });
      }
    });

    socket.on("offer", async ({ offer, from, roomId }) => {
      if (!peerInstance.current) {
        peerInstance.current = new PeerService();

        // Add local stream to the peer connection
        addTracksInOrder(peerInstance.current.peer, localStream);

        // Listen for remote stream
        peerInstance.current.peer.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
        };

        // Handle ICE candidates
        peerInstance.current.peer.onicecandidate = (event) => {
          if (event.candidate) {
            // console.log("Sending ICE candidate");
            socket.emit("ice-candidate", {
              candidate: event.candidate,
              to: from,
            });
          }
        };
      }
      // Set the remote offer and create an answer
      try {
        await peerInstance.current.setRemoteDescription(offer);
        const answer = await peerInstance.current.getAnswer(offer);
        socket.emit("answer", { answer, to: from });
      } catch (error) {
        toast.error("Connection Failed. Click Next!");
      }
    });

    // Receive an answer
    socket.on("answer", async ({ answer }) => {
      const peer = peerInstance.current?.peer;

      if (!peer) return;

      //➡️ Get the current signaling state of the peer.
      // States can be: stable, have-local-offer, etc
      const state = peer.signalingState;

      if (state === "have-local-offer") {
        try {
          await peerInstance.current.setRemoteDescription(answer);
        } catch (error) {
          toast.error("Failed to set remote answer.");
          console.error("Error setting remote answer:", error);
        }
      } else if (state === "stable") {
        // Already set?
        console.warn(
          "Answer received but signalingState is already stable. Ignoring."
        );
      } else {
        console.error(
          `Cannot set remote answer: Unexpected signaling state '${state}'`
        );
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      console.log("Received ICE candidate");
      if (peerInstance.current) {
        try {
          await peerInstance.current.peer.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    });

    // Cleanup socket listeners on unmount
    return () => {
      socket.off("start-joining");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [socketRef, localStream]);

  const handleStart = () => {
    setIsFinding(true);
    console.log("i am on hadleStart");
    socket.emit("start-connecting");
  };
  const handleNext = () => {
    if (nextProcessing) return;
    setNextProcessing(true);

    if (peerInstance.current) {
      const pc = peerInstance.current.peer;
      pc.ontrack = null;
      pc.onicecandidate = null;   
     
      pc.close();
      peerInstance.current = null;
    }

    setRemoteStream(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    setIsFinding(true);
    console.log("friend id",friendSocketId)
    socket.emit("next", { otherUserId:friendSocketId });
   // toast.success("Finding Next User!");

    setTimeout(() => setNextProcessing(false), 1500); // 1.5s stop repeadly clicked on next button
  };
  const handleStop=()=>{
    if (peerInstance.current) {
      peerInstance.current.peer.close();
      peerInstance.current = null;
    }
    setRemoteStream(null);
   
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    socket.emit("stop", { friendSocketId });
   // toast.success("Stopped Successfully.");
  };

  return (
  <div className=" w-full min-h-screen  flex flex-col justify-center gap-3 items-center py-4">
    {/* Top Debug Info */}
    <div className="text-white text-sm flex flex-col items-center gap-1">
      <p>🧑‍💻 My Socket ID: <span className="text-green-400">{mySocketId}</span></p>
      <p>🎯 Friend Socket ID: <span className="text-blue-400">{friendSocketId}</span></p>
    </div>

    {/* Video Section */}
    <div className="flex gap-4 items-center justify-center">
      {/* Local Video */}
      <div className="bg-amber-300 border-4 border-red-800 w-[400px] h-[300px] rounded-xl overflow-hidden">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover rotate-y-180"
        />
      </div>

      {/* Remote Video or Placeholder */}
      <div className="bg-amber-300 border-4 border-red-800 w-[400px] h-[300px] rounded-xl flex items-center justify-center text-xl font-semibold text-gray-800">
        {isFinding ? (
          <p>🔍 Finding a stranger...</p>
        ) : (
          <video
            ref={remoteVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover rotate-y-180"
          />
        )}
      </div>
    </div>

    {/* Control Buttons */}
    <div className="flex gap-6 py-4 fixed bottom-4">
      <button
        onClick={handleStart}
        className="bg-green-600 text-white px-6 py-2 rounded-lg shadow hover:bg-green-700 transition"
      >
        ▶️ Start
      </button>
      <button
        onClick={handleNext}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition"
      >
        🔁 Next
      </button>
      <button
        onClick={handleStop}
        className="bg-red-600 text-white px-6 py-2 rounded-lg shadow hover:bg-red-700 transition"
      >
        ⛔ Stop
      </button>
    </div>
  </div>
);

}

export default Room;
