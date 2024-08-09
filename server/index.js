const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const app = express();
const socket = require("socket.io");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connetion Successfull");
  })
  .catch((err) => {
    console.log(err.message);
  });

app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

const server = app.listen(process.env.PORT, () =>
  console.log(`Server started on ${process.env.PORT}`)
);
const io = socket(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

global.onlineUsers = new Map();
io.on("connection", (socket) => {
  global.chatSocket = socket;
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", data.msg);
    }
  });

  socket.on("send-is-typing", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("recieve-is-typing", data.msg);
    }
  });

  socket.on("connect-request", ({ to, from }) => {
    const sendUserSocket = onlineUsers.get(to);
    if (sendUserSocket) {
      const roomId = uuidv4();
      socket.to(sendUserSocket).emit("connect-request-received", { roomId, from });
    }
  });

  socket.on("accept-connect", ({ roomId, to }) => {
    const sendUserSocket = onlineUsers.get(to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("connect-accepted", { roomId });
    }
  });

  socket.on("join-room", ({ roomId, userId }) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);
  });

  socket.on("send-message", ({ roomId, message, from }) => {
    socket.to(roomId).emit("receive-message", { message, from });
  });

  // Handle WebRTC signaling
  socket.on("offer", ({ offer }) => {
    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", ({ answer }) => {
    socket.broadcast.emit("answer", answer);
  });

  socket.on("candidate", ({ candidate }) => {
    socket.broadcast.emit("candidate", candidate);
  });
});
