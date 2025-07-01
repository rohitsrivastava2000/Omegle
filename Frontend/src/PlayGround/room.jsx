import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../Context/SocketProvider";

function Room() {
  const [localStream, setLocalStream] = useState(null);

  const localVideoRef = useRef(null);
  const socketRef=useRef(null);

  const {socket}=useContext(SocketContext);

  useEffect(() => {
    socketRef.current=socket;
    const getPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setLocalStream(stream);
        console.log(stream)
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

  const handleStart=()=>{
    socketRef.current.emit('start-calling');
  }

  return (
    <div className="w-full min-h-screen bg-gray-700 flex justify-center items-center">
      <div className="flex gap-3">
        {/* local Stream */}
        <div className="flex justify-center items-center bg-amber-300 border-4 border-red-800 w-[500px] h-[300px]">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="h-full rotate-y-180 w-full object-cover"
          ></video>
        </div>
        {/* Remote Stream */}
        <div className="flex justify-center items-center bg-amber-300 border-4 border-red-800 w-[500px] h-[300px]">
          <p>Box2</p>
        </div>
      </div>
      <button onClick={handleStart} >Start Connnecting...</button>
    </div>
  );
}

export default Room;
