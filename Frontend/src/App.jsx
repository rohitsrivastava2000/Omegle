import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import {  Route, Routes } from "react-router-dom";
import { useContext } from "react";
import { SocketContext } from "./Context/SocketProvider";
import { useEffect } from "react";
import Room from "./PlayGround/room";
// import StarsBackground from "./Component/StarsBackground";

function App() {
 

  return (
    <>
      
      <Routes>
        <Route path="/playground" element={<Room/>} />
      </Routes>
    </>
  );
}

export default App;
