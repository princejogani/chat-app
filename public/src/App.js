import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SetAvatar from "./components/SetAvatar";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MeetingRoom from "./pages/MeetingRoom";
import { io } from "socket.io-client";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/setAvatar" element={<SetAvatar />} />
        <Route path="/" element={<Chat io={io} />} />
        <Route path="/meeting/:roomId" element={<MeetingRoom io={io} />} />
      </Routes>
    </BrowserRouter>
  );
}
