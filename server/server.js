// ✅ 1. Import required modules
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const Message = require("./models/Message");

// ✅ 2. Load environment variables
dotenv.config();

// ✅ 3. Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// ✅ 4. Middlewares
app.use(cors());
app.use(express.json());

// ✅ 5. Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ 6. Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // 👈 your Vite React frontend URL
    methods: ["GET", "POST"],
  },
});

// ✅ 7. Handle socket connections
io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);

  // 7.1 Send chat history from database
  Message.find()
    .sort({ createdAt: 1 })
    .then((messages) => {
      socket.emit("chatHistory", messages);
    })
    .catch((err) => console.error("Error fetching chat history:", err));

  // 7.2 Listen for new messages from clients
  socket.on("sendMessage", async (data) => {
    try {
      // Save message to MongoDB
      const newMessage = new Message({
        username: data.username,
        text: data.text,
      });
      await newMessage.save();

      // Broadcast message to everyone (including sender)
      io.emit("receiveMessage", newMessage);
      console.log("💬 Message saved & broadcast:", data.text);
    } catch (error) {
      console.error("❌ Error saving message:", error);
      
    }
  });

  // 7.3 Handle user disconnect
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// ✅ 8. Test route (optional)
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ✅ 9. Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
