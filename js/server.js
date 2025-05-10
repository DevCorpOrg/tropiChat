// server.js - Backend implementation for TropiChat
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const ethers = require('ethers');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tropichat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  walletAddress: { type: String, required: true, unique: true },
  walletType: String,
  color: String,
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  username: { type: String, required: true },
  walletAddress: { type: String, required: true },
  color: String,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

// Track active users
const activeUsers = new Map();

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  let currentUser = null;

  // Handle user join
  socket.on('join', async (userData) => {
    try {
      const { username, walletAddress, walletType, color, signature, message } = userData;
      
      // Verify wallet signature (for Ethereum wallets)
      let verified = false;
      
      if (signature && message) {
        try {
          const recoveredAddress = ethers.utils.verifyMessage(message, signature);
          verified = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
          console.log('Signature verification:', verified ? 'Successful' : 'Failed');
        } catch (error) {
          console.error('Signature verification error:', error);
          socket.emit('error', { message: 'Invalid signature' });
          return;
        }
      } else {
        // For demo purposes, allow without signature
        verified = true;
        console.log('No signature provided, bypassing verification');
      }
      
      if (!verified) {
        socket.emit('error', { message: 'Wallet verification failed' });
        return;
      }
      
      // Save or update user
      let user = await User.findOne({ walletAddress });
      
      if (user) {
        // Update existing user
        user.username = username;
        user.walletType = walletType;
        user.color = color;
        user.lastSeen = new Date();
        await user.save();
      } else {
        // Create new user
        user = new User({
          username,
          walletAddress,
          walletType,
          color,
          lastSeen: new Date()
        });
        await user.save();
      }
      
      // Store user info
      currentUser = {
        id: socket.id,
        username,
        walletAddress,
        color
      };
      
      // Add user to active users
      activeUsers.set(socket.id, currentUser);
      
      // Join main chat room
      socket.join('main-room');
      
      // Send welcome message
      socket.emit('welcome', { 
        user: currentUser,
        message: `Welcome to TropiChat, ${username}!`
      });
      
      // Broadcast user joined to others
      socket.to('main-room').emit('user-joined', {
        username,
        color,
        timestamp: new Date()
      });
      
      // Send active users list
      const usersList = Array.from(activeUsers.values()).map(user => ({
        username: user.username,
        color: user.color
      }));
      
      io.to('main-room').emit('active-users', usersList);
      
      // Send last 50 messages
      const lastMessages = await Message.find()
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
        
      socket.emit('message-history', lastMessages.reverse());
      
    } catch (error) {
      console.error('Join error:', error);
      socket.emit('error', { message: 'Error joining chat' });
    }
  });
  
  // Handle chat message
  socket.on('chat-message', async (messageData) => {
    try {
      if (!currentUser) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      const { content } = messageData;
      
      // Create and save message
      const message = new Message({
        content,
        username: currentUser.username,
        walletAddress: currentUser.walletAddress,
        color: currentUser.color,
        timestamp: new Date()
      });
      
      await message.save();
      
      // Broadcast message to everyone
      io.to('main-room').emit('chat-message', {
        id: message._id,
        content,
        username: currentUser.username,
        color: currentUser.color,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Message error:', error);
      socket.emit('error', { message: 'Error sending message' });
    }
  });
  
  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    if (!currentUser) return;
    
    socket.to('main-room').emit('user-typing', {
      username: currentUser.username,
      isTyping
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (currentUser) {
      // Remove from active users
      activeUsers.delete(socket.id);
      
      // Broadcast user left
      io.to('main-room').emit('user-left', {
        username: currentUser.username,
        timestamp: new Date()
      });
      
      // Update active users list
      const usersList = Array.from(activeUsers.values()).map(user => ({
        username: user.username,
        color: user.color
      }));
      
      io.to('main-room').emit('active-users', usersList);
      
      // Update lastSeen in database
      User.findOneAndUpdate(
        { walletAddress: currentUser.walletAddress },
        { lastSeen: new Date() }
      ).catch(err => console.error('Error updating lastSeen:', err));
    }
  });
});

// API routes
app.get('/api/users/online', async (req, res) => {
  try {
    const users = Array.from(activeUsers.values()).map(user => ({
      username: user.username,
      color: user.color
    }));
    
    res.json(users);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/messages/recent', async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
      
    res.json(messages.reverse());
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});