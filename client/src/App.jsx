import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SERVER_URL);

export default function App() {
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [usersOnline, setUsersOnline] = useState([]);
  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Receive messages and chat history
  useEffect(() => {
    socket.on("chatHistory", (history) => setMessages(history));
    socket.on("receiveMessage", (msg) => setMessages((prev) => [...prev, msg]));

    return () => {
      socket.off("chatHistory");
      socket.off("receiveMessage");
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing indicator
  const handleTyping = () => {
    socket.emit("typing", true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing", false);
    }, 1200);
  };

  socket.on("typingUsers", (users) => setTypingUsers(users));

  // Join chat
  const handleJoin = () => {
    if (!username.trim()) return;
    setJoined(true);
    socket.emit("user_join", username.trim());
  };

  // Send message
  const sendMessage = () => {
    if (!text.trim()) return;
    socket.emit("sendMessage", { username, text });
    setText("");
    socket.emit("typing", false);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Inter, system-ui, Arial",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 280,
          borderRight: "1px solid #eee",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #eee",
            fontWeight: 600,
            fontSize: 18,
          }}
        >
          Chat App
        </div>

        {!joined ? (
          <div
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <input
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
            />
            <button
              onClick={handleJoin}
              style={{
                padding: 10,
                borderRadius: 6,
                border: "none",
                backgroundColor: "#4f46e5",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Join Chat
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: 16, fontSize: 14, color: "#555" }}>
              Online Users ({usersOnline.length})
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
              {usersOnline.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    marginBottom: 4,
                    backgroundColor: "#f1f1f1",
                  }}
                >
                  {u.username}
                </div>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Main Chat */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Messages */}
        <div
          style={{
            flex: 1,
            padding: "16px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg._id}
              style={{
                alignSelf:
                  msg.username === username ? "flex-end" : "flex-start",
                maxWidth: "60%",
                backgroundColor:
                  msg.username === username ? "#4f46e5" : "#e5e7eb",
                color: msg.username === username ? "#fff" : "#111",
                padding: "10px 14px",
                borderRadius: 12,
                wordBreak: "break-word",
              }}
            >
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                {msg.username}
              </div>
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div style={{ padding: "0 16px", fontSize: 12, color: "#555" }}>
            {typingUsers.join(", ")} typing...
          </div>
        )}

        {/* Input */}
        {joined && (
          <div
            style={{
              display: "flex",
              padding: 16,
              borderTop: "1px solid #eee",
              gap: 8,
            }}
          >
            <input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#4f46e5",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
