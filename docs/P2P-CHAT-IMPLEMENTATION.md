# Peer-to-Peer Implementation for TropiChat

This guide explains how to implement a peer-to-peer (P2P) version of TropiChat using WebRTC, which allows direct communication between users without messages passing through a central server.

## Overview

In a P2P architecture:
- Users connect directly to each other instead of to a central server
- Messages travel directly between users' browsers
- A small signaling server is still needed for initial connection setup
- Each peer maintains connections with all other peers in the chat

### Advantages of P2P for Web3 Chats

1. **Greater Decentralization**: Aligns with Web3 philosophy
2. **Enhanced Privacy**: Messages aren't stored on a central server
3. **Lower Server Costs**: Minimal server infrastructure needed
4. **Better Resilience**: No single point of failure
5. **Reduced Latency**: Direct communication between peers

## Implementation Steps

### 1. Set Up a Minimal Signaling Server

Even in P2P architectures, a small server is needed for initial connection setup (signaling). This server is much simpler than a full chat server:

```javascript
// signaling-server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Store connected peers
const peers = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  let currentUser = null;
  
  // Handle user authentication
  socket.on('authenticate', async (data) => {
    try {
      const { username, walletAddress, color, signature, message } = data;
      
      // Verify wallet signature (optional but recommended)
      let verified = false;
      if (signature && message) {
        try {
          const recoveredAddress = ethers.utils.verifyMessage(message, signature);
          verified = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
        } catch (error) {
          console.error('Signature verification error:', error);
          socket.emit('auth_error', { message: 'Invalid signature' });
          return;
        }
      } else {
        // For demo purposes, allow without signature
        verified = true;
      }
      
      if (!verified) {
        socket.emit('auth_error', { message: 'Authentication failed' });
        return;
      }
      
      // Store user info
      currentUser = {
        id: socket.id,
        username,
        walletAddress,
        color
      };
      
      // Add to peers list
      peers.set(socket.id, currentUser);
      
      // Send success response
      socket.emit('authenticated', { id: socket.id, peers: Array.from(peers.values()) });
      
      // Notify other peers about new user
      socket.broadcast.emit('peer_joined', currentUser);
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth_error', { message: 'Authentication error' });
    }
  });
  
  // WebRTC signaling
  socket.on('signal', (data) => {
    const { peerId, signal } = data;
    
    // Forward signal to the specified peer
    const targetSocket = io.sockets.sockets.get(peerId);
    if (targetSocket) {
      targetSocket.emit('signal', {
        peerId: socket.id,
        signal
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    
    if (currentUser) {
      // Remove from peers list
      peers.delete(socket.id);
      
      // Notify other peers
      socket.broadcast.emit('peer_left', { id: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
```

### 2. Install the Required Dependencies for P2P Communication

```bash
# In your project directory
npm install simple-peer wrtc

# For the signaling server
npm install express socket.io cors ethers
```

### 3. Create a P2P Client Module

Create a new file called `p2p-client.js` to handle peer connections:

```javascript
/**
 * P2P client module for TropiChat
 * Handles WebRTC peer connections
 */
const p2pClient = (function() {
    // Import dependencies
    const SimplePeer = window.SimplePeer;
    
    // Private variables
    let _socket = null;
    let _peers = new Map();
    let _currentUser = null;
    let _connected = false;
    let _serverUrl = 'http://localhost:3000'; // Change to your signaling server URL
    
    // Event callbacks
    let _messageCallbacks = [];
    let _peerJoinedCallbacks = [];
    let _peerLeftCallbacks = [];
    let _connectedCallbacks = [];
    let _errorCallbacks = [];
    
    /**
     * Initialize P2P client
     * @param {String} serverUrl - Signaling server URL
     */
    function init(serverUrl) {
        if (serverUrl) {
            _serverUrl = serverUrl;
        }
        
        // Load dependencies if needed
        loadDependencies(() => {
            // Connect to signaling server
            connectSignalingServer();
        });
    }
    
    /**
     * Load required dependencies
     * @param {Function} callback - Callback function
     */
    function loadDependencies(callback) {
        let loaded = 0;
        const required = 2;
        
        // Check if Socket.io is loaded
        if (typeof io === 'undefined') {
            const socketScript = document.createElement('script');
            socketScript.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
            socketScript.onload = () => {
                loaded++;
                if (loaded === required) callback();
            };
            document.head.appendChild(socketScript);
        } else {
            loaded++;
        }
        
        // Check if SimplePeer is loaded
        if (typeof SimplePeer === 'undefined') {
            const peerScript = document.createElement('script');
            peerScript.src = 'https://cdn.jsdelivr.net/npm/simple-peer@9.11.1/simplepeer.min.js';
            peerScript.onload = () => {
                loaded++;
                if (loaded === required) callback();
            };
            document.head.appendChild(peerScript);
        } else {
            loaded++;
        }
        
        // If everything is already loaded, call callback immediately
        if (loaded === required) callback();
    }
    
    /**
     * Connect to signaling server
     */
    function connectSignalingServer() {
        try {
            _socket = io(_serverUrl);
            
            // Set up socket event listeners
            _socket.on('connect', onSocketConnect);
            _socket.on('disconnect', onSocketDisconnect);
            _socket.on('authenticated', onAuthenticated);
            _socket.on('auth_error', onAuthError);
            _socket.on('peer_joined', onPeerJoined);
            _socket.on('peer_left', onPeerLeft);
            _socket.on('signal', onSignal);
            
            console.log('Connected to signaling server');
        } catch (error) {
            console.error('Error connecting to signaling server:', error);
            _errorCallbacks.forEach(cb => cb({ message: 'Failed to connect to signaling server' }));
        }
    }
    
    /**
     * Handle socket connection
     */
    function onSocketConnect() {
        console.log('Socket connected to signaling server');
    }
    
    /**
     * Handle socket disconnection
     */
    function onSocketDisconnect() {
        console.log('Socket disconnected from signaling server');
        _connected = false;
    }
    
    /**
     * Handle authentication success
     * @param {Object} data - Authentication data
     */
    function onAuthenticated(data) {
        console.log('Authenticated with signaling server:', data);
        
        // Store assigned ID
        _currentUser.id = data.id;
        _connected = true;
        
        // Connect to existing peers
        if (data.peers && data.peers.length > 0) {
            data.peers.forEach(peer => {
                // Don't connect to ourselves
                if (peer.id !== _currentUser.id) {
                    initPeerConnection(peer.id, true);
                }
            });
        }
        
        // Notify connected callbacks
        _connectedCallbacks.forEach(cb => cb(_currentUser));
    }
    
    /**
     * Handle authentication error
     * @param {Object} error - Error data
     */
    function onAuthError(error) {
        console.error('Authentication error:', error);
        _errorCallbacks.forEach(cb => cb(error));
    }
    
    /**
     * Handle new peer joining
     * @param {Object} peer - Peer data
     */
    function onPeerJoined(peer) {
        console.log('New peer joined:', peer);
        
        // Create connection to the new peer
        initPeerConnection(peer.id, false);
        
        // Notify callbacks
        _peerJoinedCallbacks.forEach(cb => cb(peer));
    }
    
    /**
     * Handle peer leaving
     * @param {Object} data - Peer data
     */
    function onPeerLeft(data) {
        console.log('Peer left:', data);
        
        // Clean up peer connection
        const peer = _peers.get(data.id);
        if (peer) {
            peer.destroy();
            _peers.delete(data.id);
        }
        
        // Notify callbacks
        _peerLeftCallbacks.forEach(cb => cb(data));
    }
    
    /**
     * Handle incoming signal
     * @param {Object} data - Signal data
     */
    function onSignal(data) {
        const { peerId, signal } = data;
        
        // Check if we already have a connection to this peer
        let peer = _peers.get(peerId);
        
        if (peer) {
            // If we have a connection, signal it
            peer.signal(signal);
        } else {
            // Otherwise, create a new connection
            initPeerConnection(peerId, false, signal);
        }
    }
    
    /**
     * Initialize peer connection
     * @param {String} peerId - Peer ID
     * @param {Boolean} initiator - Whether we're initiating the connection
     * @param {Object} initialSignal - Initial signal data (if not initiator)
     */
    function initPeerConnection(peerId, initiator, initialSignal) {
        try {
            // Create new peer connection
            const peer = new SimplePeer({
                initiator,
                trickle: true
            });
            
            // Store peer connection
            _peers.set(peerId, peer);
            
            // Set up peer event listeners
            peer.on('signal', signal => {
                // Send signal to the peer via signaling server
                _socket.emit('signal', { peerId, signal });
            });
            
            peer.on('connect', () => {
                console.log('Connected to peer:', peerId);
                
                // Send our user data to the peer
                peer.send(JSON.stringify({
                    type: 'user_info',
                    user: _currentUser
                }));
            });
            
            peer.on('data', data => {
                try {
                    // Parse message
                    const message = JSON.parse(data);
                    
                    // Handle different message types
                    switch (message.type) {
                        case 'chat_message':
                            handleChatMessage(message.data);
                            break;
                        case 'user_info':
                            // Store peer user info
                            peer.user = message.user;
                            break;
                        default:
                            console.warn('Unknown message type:', message.type);
                    }
                } catch (error) {
                    console.error('Error handling peer data:', error);
                }
            });
            
            peer.on('error', err => {
                console.error('Peer connection error:', err);
                _errorCallbacks.forEach(cb => cb({ message: 'Peer connection error', error: err }));
            });
            
            peer.on('close', () => {
                console.log('Peer connection closed:', peerId);
                _peers.delete(peerId);
            });
            
            // If we're not the initiator and have an initial signal, process it
            if (!initiator && initialSignal) {
                peer.signal(initialSignal);
            }
        } catch (error) {
            console.error('Error creating peer connection:', error);
            _errorCallbacks.forEach(cb => cb({ message: 'Failed to create peer connection', error }));
        }
    }
    
    /**
     * Handle chat message from peer
     * @param {Object} message - Message data
     */
    function handleChatMessage(message) {
        console.log('Received chat message:', message);
        
        // Notify message callbacks
        _messageCallbacks.forEach(cb => cb(message));
    }
    
    /**
     * Authenticate with signaling server
     * @param {Object} userData - User data
     */
    function authenticate(userData) {
        if (!_socket) {
            console.error('Socket not connected');
            return;
        }
        
        // Store user data
        _currentUser = userData;
        
        // Send authentication request
        _socket.emit('authenticate', userData);
    }
    
    /**
     * Send chat message to all peers
     * @param {String} content - Message content
     */
    function sendMessage(content) {
        if (!_connected || !_currentUser) {
            console.warn('Not connected or authenticated');
            return false;
        }
        
        // Create message object
        const message = {
            id: Date.now(),
            content,
            username: _currentUser.username,
            walletAddress: _currentUser.walletAddress,
            color: _currentUser.color,
            timestamp: new Date().toISOString()
        };
        
        // Send to all connected peers
        _peers.forEach(peer => {
            if (peer.connected) {
                peer.send(JSON.stringify({
                    type: 'chat_message',
                    data: message
                }));
            }
        });
        
        // Also notify our own message callbacks
        _messageCallbacks.forEach(cb => cb(message));
        
        return true;
    }
    
    /**
     * Get all connected peers
     * @returns {Array} - Array of connected peers
     */
    function getPeers() {
        const peersList = [];
        
        _peers.forEach(peer => {
            if (peer.connected && peer.user) {
                peersList.push(peer.user);
            }
        });
        
        return peersList;
    }
    
    /**
     * Register callback for chat messages
     * @param {Function} callback - Callback function
     */
    function onMessage(callback) {
        _messageCallbacks.push(callback);
    }
    
    /**
     * Register callback for peer joined
     * @param {Function} callback - Callback function
     */
    function onPeerJoined(callback) {
        _peerJoinedCallbacks.push(callback);
    }
    
    /**
     * Register callback for peer left
     * @param {Function} callback - Callback function
     */
    function onPeerLeft(callback) {
        _peerLeftCallbacks.push(callback);
    }
    
    /**
     * Register callback for connected
     * @param {Function} callback - Callback function
     */
    function onConnected(callback) {
        _connectedCallbacks.push(callback);
    }
    
    /**
     * Register callback for errors
     * @param {Function} callback - Callback function
     */
    function onError(callback) {
        _errorCallbacks.push(callback);
    }
    
    /**
     * Check if connected
     * @returns {Boolean} - True if connected
     */
    function isConnected() {
        return _connected;
    }
    
    /**
     * Get current user
     * @returns {Object} - Current user
     */
    function getCurrentUser() {
        return _currentUser;
    }
    
    // Public API
    return {
        init,
        authenticate,
        sendMessage,
        getPeers,
        onMessage,
        onPeerJoined,
        onPeerLeft,
        onConnected,
        onError,
        isConnected,
        getCurrentUser
    };
})();
```

### 4. Integrate P2P Client with the Chat Module

Update your existing chat.js to work with the P2P client:

```javascript
// In the init function of your chat.js module
function init() {
    // Event listeners
    enterChatBtn.addEventListener('click', enterChat);
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Initialize P2P client
    p2pClient.init('https://your-signaling-server.com');
    
    // Register P2P event handlers
    p2pClient.onMessage(handleIncomingMessage);
    p2pClient.onPeerJoined(handlePeerJoined);
    p2pClient.onPeerLeft(handlePeerLeft);
    p2pClient.onConnected(handleConnected);
    p2pClient.onError(handleError);
    
    // Clear welcome messages - they'll come after P2P connection
    chatMessages.innerHTML = '';
}

// Replace enterChat function
async function enterChat() {
    const username = usernameInput.value.trim();
    
    if (username) {
        // Get wallet info
        const address = wallet.getAddress();
        const walletProvider = wallet.getProviderName();
        
        // Create user object
        _currentUser = {
            username: username,
            walletAddress: address,
            walletType: walletProvider,
            color: CONFIG.USER_COLORS[Math.floor(Math.random() * CONFIG.USER_COLORS.length)]
        };
        
        try {
            // Sign message for authentication if wallet supports it
            let signature = null;
            let message = null;
            
            if (typeof wallet.signMessage === 'function') {
                message = `TropiChat P2P Authentication\nTimestamp: ${Date.now()}\nWallet: ${_currentUser.walletAddress}`;
                signature = await wallet.signMessage(message);
            }
            
            // Authenticate with P2P network
            p2pClient.authenticate({
                username: _currentUser.username,
                walletAddress: _currentUser.walletAddress,
                color: _currentUser.color,
                signature,
                message
            });
            
            // Close login modal
            loginModal.style.display = 'none';
            
            // Enable chat functionality
            messageInput.disabled = false;
            sendButton.disabled = false;
            
            // Save user profile if available
            if (window.appFunctions && window.appFunctions.saveUserProfile) {
                window.appFunctions.saveUserProfile(address, username);
            }
        } catch (error) {
            console.error('Error joining chat:', error);
            alert('Error connecting to P2P network. Please try again.');
        }
    } else {
        alert('Please enter a username!');
    }
}

// Replace sendMessage function
function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (messageText && _currentUser) {
        // Check for commands
        if (messageText.startsWith('/')) {
            handleCommand(messageText);
        } else {
            // Send via P2P network
            const success = p2pClient.sendMessage(messageText);
            
            if (!success) {
                addSystemMessage('Failed to send message. Not connected to P2P network.');
            }
        }
        
        // Clear input
        messageInput.value = '';
    }
}

// Add handler for P2P connection
function handleConnected(user) {
    console.log('Connected to P2P network as:', user);
    addSystemMessage('Connected to P2P network!');
    addSystemMessage('Type /help for available commands.');
}

// Add handler for peers joining
function handlePeerJoined(peer) {
    addSystemMessage(`${peer.username} has joined the chat!`);
    updateOnlineUsers();
}

// Add handler for peers leaving
function handlePeerLeft(peer) {
    addSystemMessage(`${peer.id} has left the chat.`);
    updateOnlineUsers();
}

// Add function to update online users list
function updateOnlineUsers() {
    // Clear current list
    onlineUsersContainer.innerHTML = '';
    
    // Add current user
    const userElement = document.createElement('div');
    userElement.classList.add('online-user');
    userElement.textContent = _currentUser.username + ' (You)';
    userElement.style.color = _currentUser.color;
    onlineUsersContainer.appendChild(userElement);
    
    // Add connected peers
    const peers = p2pClient.getPeers();
    peers.forEach(peer => {
        const peerElement = document.createElement('div');
        peerElement.classList.add('online-user');
        peerElement.textContent = peer.username;
        peerElement.style.color = peer.color;
        onlineUsersContainer.appendChild(peerElement);
    });
}

// Add handler for incoming messages
function handleIncomingMessage(message) {
    // Determine if this is my message
    const isMyMessage = message.walletAddress === _currentUser.walletAddress;
    
    // Add message to chat
    addUserMessage({
        name: isMyMessage ? 'You' : message.username,
        color: message.color
    }, message.content);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add handler for P2P errors
function handleError(error) {
    console.error('P2P error:', error);
    addSystemMessage(`Error: ${error.message || 'Unknown error'}`);
}
```

### 5. Add WebRTC Libraries to Your HTML

```html
<!-- Add these before your other scripts -->
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/simple-peer@9.11.1/simplepeer.min.js"></script>
<script src="js/p2p-client.js"></script>
```

## Dealing with P2P Challenges

### NAT Traversal and STUN/TURN Servers

WebRTC requires STUN/TURN servers to establish connections between peers behind NATs or firewalls:

```javascript
// In your p2p-client.js, update the SimplePeer initialization
const peer = new SimplePeer({
    initiator,
    trickle: true,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            {
                urls: 'turn:your-turn-server.com:3478',
                username: 'username',
                credential: 'password'
            }
        ]
    }
});
```

You can use free STUN servers, but for reliable connections, you may need a TURN server:
- Free providers: Twilio, Google (limited usage)
- Paid services: Xirsys, Twilio (beyond free tier)
- Self-hosted: coturn (open source)

### Scalability Considerations

P2P networks face challenges with large numbers of users:

1. **Mesh Network Limitations**: Each peer must maintain connections with all other peers, which grows exponentially (n*(n-1)/2 connections).

2. **Solutions for Larger Chats**:
   - **Hybrid P2P**: Use a server to relay messages for users who can't establish direct connections.
   - **SFU (Selective Forwarding Unit)**: Have some peers act as relays for others.
   - **Room-based Architecture**: Limit the number of peers in each room (e.g., max 20 users per room).

### Data Persistence

P2P chats don't inherently store message history. Options to handle this:

1. **Local Storage**: Store messages in each user's browser (limited to their session).

2. **Distributed Storage**:
   - IPFS for storing chat history
   - Orbit-DB (built on IPFS) for distributed databases

3. **Simple Example for Local Storage**:
   ```javascript
   // Save message to local storage
   function saveMessageToHistory(message) {
       const history = JSON.parse(localStorage.getItem('chat_history') || '[]');
       history.push(message);
       localStorage.setItem('chat_history', JSON.stringify(history));
   }
   
   // Load history on startup
   function loadChatHistory() {
       const history = JSON.parse(localStorage.getItem('chat_history') || '[]');
       history.forEach(message => {
           handleIncomingMessage(message, true);
       });
   }
   ```

## Advanced P2P Features for TropiChat

### 1. End-to-End Encryption

Add message encryption using the user's wallet keys:

```javascript
// in p2p-client.js
async function encryptMessage(message, recipientPublicKey) {
    // This would use the wallet's encryption capabilities
    // or a library like eth-crypto for Ethereum wallets
    const encryptedMessage = await window.ethereum.request({
        method: 'eth_encrypt',
        params: [JSON.stringify(message), recipientPublicKey]
    });
    
    return encryptedMessage;
}

async function decryptMessage(encryptedMessage) {
    const decryptedMessage = await window.ethereum.request({
        method: 'eth_decrypt',
        params: [encryptedMessage, window.ethereum.selectedAddress]
    });
    
    return JSON.parse(decryptedMessage);
}
```

### 2. NFT-Gated Chat Rooms

Verify NFT ownership to join specific chat rooms:

```javascript
// In your signaling server
async function verifyNFTOwnership(walletAddress, nftContractAddress) {
    const provider = new ethers.providers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_INFURA_KEY');
    const contract = new ethers.Contract(nftContractAddress, ERC721ABI, provider);
    
    const balance = await contract.balanceOf(walletAddress);
    return balance.gt(0);
}

// Then in authentication
socket.on('authenticate', async (data) => {
    // Existing auth code...
    
    // Check NFT ownership for specific rooms
    if (data.room === 'vip-room') {
        const hasNFT = await verifyNFTOwnership(
            data.walletAddress, 
            '0xYourNFTContractAddress'
        );
        
        if (!hasNFT) {
            socket.emit('auth_error', { message: 'NFT ownership required for this room' });
            return;
        }
    }
    
    // Continue with authentication...
});
```

### 3. Decentralized Identity

Use DIDs (Decentralized Identifiers) for more robust identity:

```javascript
// Using Ceramic Network for DIDs
async function createDecentralizedProfile(walletAddress) {
    const CeramicClient = await import('@ceramicnetwork/http-client');
    const ThreeIdResolver = await import('@ceramicnetwork/3id-did-resolver');
    const { DID } = await import('dids');
    
    // Set up Ceramic client
    const ceramic = new CeramicClient.default('https://ceramic-clay.3boxlabs.com');
    
    // Create DID resolver
    const resolver = {
        ...ThreeIdResolver.getResolver(ceramic)
    };
    const did = new DID({ resolver });
    ceramic.did = did;
    
    // Create profile
    // Implementation depends on specific DID method
    
    return {
        did: did.id,
        // Other profile data
    };
}
```

## Testing P2P Functionality

1. **Local Testing**:
   ```bash
   # Run signaling server locally
   node signaling-server.js
   
   # Open multiple browser windows or tabs to test connections
   ```

2. **Network Testing**:
   - Use ngrok to expose your local signaling server to the internet
   - Test with friends on different networks
   - Verify connections work across different firewalls and NATs

3. **Automated Tests**:
   ```javascript
   // Example WebRTC connection test with Jest
   test('Peers can connect and exchange messages', async () => {
       // Set up two peer instances
       const peer1 = new SimplePeer({ initiator: true });
       const peer2 = new SimplePeer({ initiator: false });
       
       // Connect them directly (bypassing signaling)
       peer1.on('signal', data => peer2.signal(data));
       peer2.on('signal', data => peer1.signal(data));
       
       // Wait for connection
       await new Promise(resolve => {
           peer1.on('connect', resolve);
       });
       
       // Test message exchange
       const testMessage = 'Hello P2P world!';
       let receivedMessage = '';
       
       peer2.on('data', data => {
           receivedMessage = data.toString();
       });
       
       peer1.send(testMessage);
       
       // Wait for message to be received
       await new Promise(resolve => setTimeout(resolve, 100));
       
       expect(receivedMessage).toBe(testMessage);
   });
   ```