# TropiChat - 90s Style Web3 Chat Room

This is a nostalgic 90s-style chat room implementation with multi-wallet web3 authentication. The application has been modularized for better organization, maintainability, and extensibility.

## Features

- 🌴 Retro 90s aesthetic with animated backgrounds, marquees, and Comic Sans
- 👛 Multi-wallet support (MetaMask, Phantom, Brave Wallet, Coinbase Wallet)
- 👤 Custom username creation with colorful chat messages
- 🤖 Simulated users and responses for testing
- 💬 Chat commands like /help, /clear, /shrug, /me, and /color
- 🎨 Fully responsive design that works on mobile and desktop
- 🧩 Modular architecture for easy extension and maintenance
- 🔄 Optional peer-to-peer (P2P) implementation with WebRTC
- 🔐 Web3 wallet-based authentication and message signing
- 👥 Multi-user real-time chat capabilities

## File Structure

```
tropichat/
├── index.html               # Main HTML structure
├── css/
│   └── style.css            # All styling for the application
├── js/
│   ├── config.js            # Configuration settings and constants
│   ├── wallet.js            # Multi-wallet Web3 connection functionality
│   ├── chat.js              # Chat room functionality
│   ├── app.js               # Main application initialization
│   ├── debug.js             # Debug console for troubleshooting
│   ├── p2p-client.js        # WebRTC peer-to-peer client (P2P mode)
│   ├── p2p-webrtc-architecture.js # P2P architecture diagram
│   ├── server.js            # Backend server (Multi-user mode)
│   ├── socket-client.js     # Socket.io client (Multi-user mode)
│   └── web3-p2p-wallet-auth.js # Web3 wallet authentication for P2P
├── docs/
│   ├── MULTI-USER INTEGRATION GUIDE.md # Guide for implementing multi-user mode
│   └── P2P-CHAT-IMPLEMENTATION.md      # Guide for implementing P2P mode
└── README.md                # This documentation file
```

## Implementation Guide

### 1. Set up your file structure

Create the folders and files as shown in the structure above. Place each file in its corresponding directory.

### 2. Adding to Your Website

1. Copy the entire `tropichat` directory to your website's root folder
2. Include it in your main page with:
   ```html
   <iframe src="/tropichat/index.html" style="width: 100%; height: 600px; border: none;"></iframe>
   ```
   
3. Or link to it from your navigation:
   ```html
   <a href="/tropichat/index.html">Join Our Chat Room</a>
   ```

### 3. Wallet Support

The chat room supports multiple wallet providers:

- **Ethereum-based wallets**: MetaMask, Brave Wallet, Coinbase Wallet, Trust Wallet
- **Solana-based wallets**: Phantom
- More can be added by extending the wallet.js module

Users only need to have one of these wallets installed in their browser to connect.

### 4. Implementation Options

TropiChat now offers multiple implementation options:

#### A. Single-User Demo Mode

The default mode is a client-side only demo that simulates chat with mock responses. This is perfect for testing and development.

#### B. Multi-User Mode with Central Server

For a full implementation with server-side functionality, you'll need:

- Node.js with Express for the backend
- Socket.io for real-time communication
- MongoDB or another database to store chat history and user information

**Backend Implementation Example:**

```javascript
// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const { ethers } = require('ethers');

// Initialize server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

// Connect to database
mongoose.connect('mongodb://localhost/tropichat', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Define schemas
const User = mongoose.model('User', {
    username: String,
    wallet: String,
    provider: String,
    color: String,
    lastSeen: Date
});

const Message = mongoose.model('Message', {
    username: String,
    wallet: String,
    color: String,
    text: String,
    timestamp: Date
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Handle user join
    socket.on('join', async (userData) => {
        const { username, wallet, color, provider } = userData;
        
        // Save or update user
        await User.findOneAndUpdate(
            { wallet },
            { username, wallet, color, provider, lastSeen: new Date() },
            { upsert: true }
        );
        
        // Add user to socket room
        socket.join('main-room');
        
        // Broadcast user joined
        io.to('main-room').emit('user-joined', {
            username,
            color,
            timestamp: new Date()
        });
        
        // Send last 50 messages
        const lastMessages = await Message.find()
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();
            
        socket.emit('message-history', lastMessages.reverse());
    });
    
    // Handle chat message
    socket.on('chat-message', async (messageData) => {
        const { text, username, wallet, color } = messageData;
        
        // Save message
        const message = new Message({
            username,
            wallet,
            color,
            text,
            timestamp: new Date()
        });
        
        await message.save();
        
        // Broadcast message
        io.to('main-room').emit('chat-message', {
            username,
            color,
            text,
            timestamp: new Date()
        });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

See the `MULTI-USER INTEGRATION GUIDE.md` for more detailed implementation instructions.

#### C. Peer-to-Peer (P2P) Mode

TropiChat now supports a decentralized peer-to-peer architecture using WebRTC:

1. **Direct Communication**: Users connect directly to each other without messages passing through a central server
2. **Enhanced Privacy**: Messages can be end-to-end encrypted using wallet keys
3. **Wallet Authentication**: Uses wallet signatures to verify user identity
4. **Minimal Server**: Only requires a small signaling server for initial connections

**P2P Implementation Steps:**

1. Set up a minimal signaling server:
```javascript
// Minimal signaling server example
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  
  // Handle authentication
  socket.on('authenticate', (userData) => {
    // Verify wallet signature (can be added)
    socket.broadcast.emit('peer_joined', userData);
  });
  
  // WebRTC signaling
  socket.on('signal', (data) => {
    const { peerId, signal } = data;
    io.to(peerId).emit('signal', {
      peerId: socket.id,
      signal
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    socket.broadcast.emit('peer_left', { id: socket.id });
  });
});

server.listen(3000, () => console.log('Signaling server running on port 3000'));
```

2. Include WebRTC libraries:
```html
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/simple-peer@9.11.1/simplepeer.min.js"></script>
```

For complete P2P implementation details, see the `P2P-CHAT-IMPLEMENTATION.md` guide.

### 5. Debugging

The chat room includes a built-in debug console that can help troubleshoot wallet connection issues:

1. **Accessing the Debug Console**: 
   - A small "Debug" button appears in the bottom right corner
   - Click it to toggle the debug console

2. **Available Debug Commands**:
   - `help` - Show available commands
   - `clear` - Clear the console
   - `info` - Show system information
   - `detect` - Detect available wallet providers
   - `connect` - Try to connect to a wallet
   - `localStorage` - Show stored data

3. **Troubleshooting Wallet Connection**:
   - If wallet connection fails, open the debug console and type `info` to see if wallets are detected
   - Use `detect` to force a new wallet detection scan
   - Check browser console (F12) for additional error messages

4. **Disabling Debug Mode**:
   - For production deployment, you can disable debug mode by setting `debug: false` in the appState object in app.js

### 6. Customization

You can customize TropiChat by:

1. Modifying `config.js` to change settings, mock users, and responses
2. Updating `style.css` to change the visual appearance
3. Adding new commands in the `handleCommand` function in `chat.js`
4. Adding new emoji options to the emoji picker in `index.html`
5. Implementing new wallet providers in `wallet.js`

### 7. Security Considerations

When implementing this chat in production:

1. Always verify wallet signatures on the server to prevent address spoofing
2. Implement rate limiting to prevent spam
3. Add moderation tools for inappropriate content
4. Consider encrypting messages for privacy
5. Store sensitive data securely and follow data protection regulations

### 8. Advanced P2P Features

The P2P implementation supports several advanced features:

1. **End-to-End Encryption**:
   - Messages can be encrypted using wallet keys
   - Only the intended recipients can decrypt messages
   
2. **NFT-Gated Chat Rooms**:
   - Create exclusive chat rooms that require NFT ownership
   - Verify NFT ownership through wallet authentication
   
3. **Decentralized Identity**:
   - Integrate with DIDs (Decentralized Identifiers)
   - Create persistent user profiles without central servers

4. **Distributed Data Storage**:
   - Store chat history using IPFS
   - Implement Orbit-DB for distributed databases# tropiChat

## License

This project is licensed under the MIT License with Additional Clauses - see the [LICENSE](LICENSE) file for details.

Created by [@kitbaroness](https://github.com/kitbaroness) for [DevCorp Organization](https://github.com/DevCorpOrg) on GitHub.