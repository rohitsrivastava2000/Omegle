import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../Context/SocketProvider";
import PeerService from "../Service/peer";
import "./scrollBar.css";
import {
  CircleArrowRight,
  CirclePlay,
  CircleStop,
  Loader,
  SendHorizonal,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import toast from "react-hot-toast";

function Room() {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isFinding, setIsFinding] = useState(false);
  const [mySocketId, setMySocketId] = useState("");
  const [friendSocketId, setFriendSocketId] = useState("");
  const [nextProcessing, setNextProcessing] = useState(false);
  const [allMessages, setAllMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [audioEnable, setAudioEnable] = useState(true);
  const [videoEnable, setVideoEnable] = useState(true);
  const [showButton, setShowButton] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerInstance = useRef(null);
  const messageContainerRef = useRef(null);
  const [onlineUser, setOnlineUser] = useState(0);

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
        
        toast.error('Please allow camera/microphone')
        if (error.name === "NotAllowedError") {
           toast.error("Camera/Mic Permission Denied.");
          console.warn("Permissions denied for camera/microphone.");
        } else if (error.name === "NotFoundError") {
           toast.error("No Camera/Mic Found.");
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
      // console.log("MysocketId", mySocketId);
      // console.log("FriendSocketId", friendSocketId);
      if (!localStream) {
        console.warn("Local stream not ready yet!");
        return;
      }

      if (peerInstance.current) {
        //  Ensure previous instance is cleaned up
        peerInstance.current.peer.ontrack = null;
        peerInstance.current.peer.onicecandidate = null;
        peerInstance.current.peer.close();
        peerInstance.current = null;
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
        toast.error("Connection Failed");
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
         // toast.error("Failed to set remote answer.");
         // console.error("Error setting remote answer:", error);
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

    socket.on("clear-message", () => {
      setIsFinding(true);
      setAllMessages([]);
      toast.error('User left')
    });

    socket.on("send-message", ({ message, mySocketId }) => {
      setAllMessages((prev) => [
        ...prev,
        { message: message, user: mySocketId },
      ]);
    });
    socket.on("video-muted", () => {
      console.log("video muted")
      toast.error("User Turned Off Video");
    });

    socket.on("audio-muted", () => {
      toast.error("User Mute Audio");
    });

    socket.on("live-user", ({ liveUser }) => {
      console.log("live user yeh hai", liveUser);
      setOnlineUser(liveUser);
    });

    // Cleanup socket listeners on unmount
    return () => {
      socket.off("start-joining");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("clear-message");
      socket.off("send-message");
      socket.off("video-muted");
       socket.off("audio-muted");
    };
  }, [socketRef, localStream]);

  const handleStart = () => {
    setIsFinding(true);
    setShowButton(true);
    toast.success('Waiting for someone to connect...')
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
    setAllMessages([]);
    console.log("friend id", friendSocketId);
    socket.emit("next", { otherUserId: friendSocketId });
    toast.success("Start Finding Next User!");

    setTimeout(() => setNextProcessing(false), 1500); // 1.5s stop repeadly clicked on next button
  };
  const handleStop = () => {
    if (peerInstance.current) {
      peerInstance.current.peer.close();
      peerInstance.current = null;
    }
    setRemoteStream(null);

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setIsFinding(false);
    setAllMessages([]);
    setShowButton(false);
    socket.emit("stop", { otherUserId: friendSocketId });
    toast.success("Stopped Successfully.");
  };

  //handling messages
  const handleEnter = (e) => {
    if (e.key === "Enter" && currentMessage.trim() !== "") {
      if (!friendSocketId) {
        
        toast.error('First to Connect Someone');
        return;
      }
      setAllMessages((prev) => [
        ...prev,
        { message: currentMessage, user: mySocketId },
      ]);
      setCurrentMessage(""); // clear input after sending

      socket.emit("send-message", {
        message: currentMessage,
        otherUserId: friendSocketId,
        mySocketId: mySocketId,
      });
    }
  };

  //handling scroll bar
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [allMessages]);

  // toggling the video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnable(videoTrack.enabled);
         toast.success(
          videoTrack.enabled ? "Video On" : "Video Off"
        );

        if (!videoTrack.enabled) {
          console.log(friendSocketId,"toggle video")
          socket.emit("video-muted", { otherUserId: friendSocketId });
        }
      }
    }
  };
  //toggling the audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnable(audioTrack.enabled);
         toast.success(
          audioTrack.enabled ? "Mic Unmuted" : "Mic Muted."
        );
        if (!audioTrack.enabled) {
          socket.emit("audio-muted", { otherUserId: friendSocketId });
        }
      }
    }
  };

  return (
    <div
      className="w-full min-h-screen px-6 py-3 flex flex-col gap-6"
      style={{
        backgroundImage: `
        linear-gradient(to bottom right, rgba(40, 40, 40, 0.9), rgba(10, 10, 10, 0.95)),
        url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' width='20' height='20' fill='none' stroke-width='1' stroke='%23222222'%3e%3cpath d='M0 .5H19.5V20'/%3e%3c/svg%3e")
      `,
        backgroundBlendMode: "overlay",
        backgroundRepeat: "repeat",
      }}
    >
      {/* Navbar */}
      <nav className="w-full h-14 bg-[#141414] flex items-center justify-between px-4 shadow-md rounded-tl-lg rounded-tr-lg">
        <div className="flex items-center" >
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: {
                  width: "2.2rem",
                  height: "2.2rem",
                },
              },
            }}
          />
        </div>
        <div className="flex-1 flex justify-center">
          <h1 className="text-xl md:text-2xl font-semibold text-[rgb(233,126,1)] tracking-wide flex items-center gap-2">
             NextMeet
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm md:text-base font-medium text-gray-300">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          {`${onlineUser} Online`}
        </div>
      </nav>

      {/* Main Section */}
      <div className="flex flex-col lg:flex-row items-start gap-8 flex-1 px-4">
        {/* Video Section */}
        <div className="flex flex-col gap-4">
          {/* Remote Video */}
          <div className="bg-gray-800  shadow-[0_0_10px_2px_rgba(233,126,1,0.5)] w-[320px] md:w-[400px] h-[240px] md:h-[300px] rounded-xl overflow-hidden  flex items-center justify-center text-white">
            {!showButton ? (
              <p>Click On Start Button To Start</p>
            ) : (
              <>
                {isFinding ? (
                  <p className="text-lg">🔍 Finding a stranger...</p>
                ) : (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full  object-cover rotate-y-180"
                  />
                )}
              </>
            )}
          </div>

          {/* Local Video */}
          <div className="bg-gray-800 relative w-[320px] md:w-[400px] h-[240px] md:h-[300px] rounded-xl overflow-hidden shadow-[0_0_10px_2px_rgba(233,126,1,0.5)]">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover rotate-y-180"
            />
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-6">
              <button
                onClick={toggleVideo}
                className={`flex items-center justify-center w-9 h-9 rounded-full shadow-[0_0_10px_2px_rgba(233,126,1,0.9)] transition-transform transform hover:scale-110 ${
                  videoEnable
                    ? "bg-gray-600 hover:bg-gray-800"
                    : "bg-red-500 hover:bg-red-600"
                } text-white`}
              >
                {videoEnable ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
              <button
                onClick={toggleAudio}
                className={`flex items-center justify-center w-9 h-9 rounded-full shadow-[0_0_10px_2px_rgba(233,126,1,0.9)] transition-transform transform hover:scale-110 ${
                  audioEnable
                    ? "bg-gray-600 hover:bg-gray-800"
                    : "bg-red-500 hover:bg-red-600"
                } text-white`}
              >
                {audioEnable ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-full flex flex-col gap-4">
          {/* Chat Box */}
          <div className="flex flex-col justify-between bg-[rgb(20,20,20)] rounded-[15px] shadow-md h-[550px] border border-gray-700 overflow-hidden">
            {/* Messages Container (scrollable + flex for alignment) */}
            <div
              ref={messageContainerRef}
              className=" chat-scroll flex-1 flex flex-col overflow-y-auto px-4 py-3  text-white"
            >
              {allMessages.map((data, index) => {
                console.log("tumhare dost ka id", friendSocketId);
                if (data.user === friendSocketId) {
                  // Stranger message (left)
                  return (
                    <div
                      key={index}
                      className="self-start bg-gray-700 text-white px-4 py-2 rounded-tl-lg rounded-tr-lg rounded-br-lg rounded-bl-none max-w-[80%] my-1"
                    >
                      {data.message}
                    </div>
                  );
                }

                if (data.user === mySocketId) {
                  // Your message (right)
                  return (
                    <div
                      key={index}
                      className="self-end bg-[rgb(30,115,232)] text-white px-4 py-2 rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none max-w-[80%] my-1"
                    >
                      {data.message}
                    </div>
                  );
                }

                return null; // fallback if no match
              })}
            </div>

            {/* Chat Input (always at bottom) */}
            <div className="px-4 py-3 border-t border-gray-700 bg-[rgb(20,20,20)]">
              <input
                type="text"
                name="chat"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={handleEnter}
                placeholder="Type your message..."
                className="w-full px-4 py-3 rounded-[15px] bg-[rgb(31,35,38)] text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-[#00FFC6]"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-evenly mt-2">
            {!showButton ? (
              <button
                onClick={handleStart}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex gap-2 items-center justify-center font-medium transition"
              >
                <CirclePlay size={20} />
                Start
              </button>
            ) : (
              <>
                <button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex gap-2 items-center justify-center  font-medium transition"
                >
                  <CircleArrowRight size={20} />
                  Next
                </button>
                <button
                  onClick={handleStop}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex gap-2 items-center justify-center font-medium transition"
                >
                  <CircleStop size={20} />
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Room;
