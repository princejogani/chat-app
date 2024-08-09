/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { host } from "../utils/APIRoutes";
import { IoMdCloseCircleOutline, IoMdSend } from "react-icons/io";

export default function MeetingRoom({ io }) {
  const { roomId } = useParams();
  const socket = useRef();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(undefined);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isChatVisible, setIsChatVisible] = useState(false);
  const peerConnection = useRef(new RTCPeerConnection()); // configuration can be your STUN/TURN servers
  const remoteStreamRef = useRef(); // configuration can be your STUN/TURN servers

  useEffect(() => {
    if (!localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)) {
      navigate("/login");
    } else {
      setCurrentUser(
        JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY))
      );
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      socket.current = io(host);
      socket.current.emit("join-room", { roomId, userId: currentUser._id });

      socket.current.on("receive-message", (message) => {
        if (message.from !== currentUser.username) {
          setMessages((prevMessages) => [...prevMessages, message]);
        }
      });

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.current.emit("candidate", {candidate: event.candidate});
        }
      };

      peerConnection.current.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          // Handle the remote stream
          remoteStreamRef.current.srcObject = remoteStream;
        }
      };


      socket.current.on("offer", async (offer) => {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.current.emit("answer", { answer });
      });

      socket.current.on("answer", async (answer) => {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.current.on("candidate", async (candidate) => {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding received ice candidate", error);
        }
      });
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [currentUser]);

  async function startScreenShare() {
    try {
      // Capture the screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // Add the screen-sharing stream to the peer connection
      screenStream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, screenStream);
      });

      // Create an offer and send it to the peer
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.current.emit("offer", { offer });

      // Handle the offer response from the peer
      socket.current.on("answer", async (answer) => {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      });

      // Handle ICE candidates from the peer
      socket.current.on("candidate", async (candidate) => {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding received ice candidate", error);
        }
      });

    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  }


  const sendMessage = (event) => {
    event.preventDefault();
    if (message.length > 0) {
      const msg = { fromSelf: true, roomId, message, from: currentUser.username };
      socket.current.emit("send-message", msg);
      setMessages((prevMessages) => [...prevMessages, msg]);
      setMessage("");
    }
  };

  return (
    <Container>
      <VideoContainer>
        <video ref={remoteStreamRef} autoPlay playsInline style={{ width: "50%" }}></video>
        <Controls>
          <button onClick={startScreenShare}>Share Screen</button>
          <button onClick={() => setIsChatVisible(true)}>
            Chats
          </button>
        </Controls>
      </VideoContainer>
      {isChatVisible && <ChatContainer>
        <ChatHeader>
          <span>Chatting</span>
          <span onClick={() => setIsChatVisible(false)}><IoMdCloseCircleOutline /></span>
        </ChatHeader>
        <ChatMessages>
          <div className="chat-messages">
            {messages.map((message) => {
              return (
                <div
                  className={`message ${message.fromSelf ? "sended" : "recieved"
                    }`}
                >
                  <div className="content ">
                    <p>{message.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ChatMessages>
        <ChatInput>
          <form className="input-container" onSubmit={(event) => sendMessage(event)}>
            <input
              type="text"
              placeholder="type your message here"
              onChange={(e) => setMessage(e.target.value)}
              value={message}
            />
            <button type="submit">
              <IoMdSend />
            </button>
          </form>
        </ChatInput>
      </ChatContainer>}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  height: 100vh;
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .message {
      display: flex;
      align-items: center;
      .content {
        max-width: 75%;
        overflow-wrap: break-word;
        padding: 1rem;
        font-size: 1.1rem;
        border-radius: 1rem;
        color: #d1d1d1;
        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 70%;
        }
      }
    }
    .sended {
      justify-content: flex-end;
      .content {
        background-color: #4f04ff21;
      }
    }
    .recieved {
      justify-content: flex-start;
      .content {
        background-color: #9900ff20;
      }
    }
  }
`;

const VideoContainer = styled.div`
  flex: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #000;
  color: #fff;
  padding: 10px;
  video {
    width: 100%;
    border: 1px solid #ddd;
  }
`;

const Controls = styled.div`
  margin-top: 10px;
  button {
    margin: 5px;
    padding: 10px 15px;
    border: none;
    background: #4caf50;
    color: #fff;
    cursor: pointer;
    border-radius: 5px;
    &:hover {
      background: #45a049;
    }
  }
`;

const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f1f1f1;
  border-left: 1px solid #ccc;
`;

const ChatMessages = styled.div`
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  background: black;
  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 10px;
  }
`;

const ChatInput = styled.div`
  display: flex;
  padding: 10px;
  border-top: 1px solid #ccc;
  input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
  }
  button {
    margin-left: 10px;
    padding: 10px 15px;
    border: none;
    background: #4caf50;
    color: #fff;
    cursor: pointer;
    border-radius: 5px;
    &:hover {
      background: #45a049;
    }
  }
`;

const Message = styled.div`
  margin-bottom: 10px;
  strong {
    color: #333;
  }
`;

const ChatHeader = styled.div`
    font-size: 22px;
    padding: 12px 10px;
    font-family: monospace;
    letter-spacing: 3px;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;
