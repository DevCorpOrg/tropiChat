# TropiChat Multi-User Integration Guide

This guide will help you transform the front-end TropiChat demo into a fully functional multi-user chat application with real-time communication between users.

## Overview

The current implementation is a client-side demo with simulated responses. To make it work with multiple real users, we need to add:

1. A backend server for message storage and user management
2. Real-time communication via WebSockets
3. Proper wallet authentication and verification
4. User presence tracking and notifications

## Implementation Steps

### 1. Set Up the Backend

#### Prerequisites:
- Node.js (v14+)
- MongoDB
- Basic knowledge of Express.js and Socket.io

#### Installation:
```bash
# Create a new folder for the server
mkdir tropichat-server
cd tropichat-server

# Initialize a new Node.js project
npm init -y

# Install dependencies
npm install express socket.io mongoose ethers cors dotenv
```

#### Server Setup:
1. Copy the `server.js` file to your server directory
2. Create a `.env` file with your configuration:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tropichat
```
3. Start the server:
```bash
node server.js
```

### 2. Integrate Socket Client with Frontend

1. Copy the `socket-client.js` file to your project's `js` directory
2. Update the `SERVER_URL` in the file to point to your backend server
3. Add the socket-client script to your HTML:

```html
<!-- Add this after your existing scripts -->
<script src="js/socket-client.js"></script>
```

### 3. Modify the Chat Module

Update your chat.js file to integrate with the socket client:

```javascript
// In the init function of your chat.js module
function init() {
    // Initialize event listeners
    enterChatBtn.addEventListener('click', enterChat);
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Initialize socket client
    chatSocket.init();
    
    // Register socket event handlers
    chatSocket.onMessage(handleIncomingMessage);
    chatSocket.onUserJoined(handleUserJoined);
    chatSocket.onUserLeft(handleUserLeft);
    chatSocket.onActiveUsers(updateOnlineUsers);
    chatSocket.onTyping(handleUserTyping);
    
    // Clear welcome messages - they'll come from the server
    chatMessages.innerHTML = '';
}

// Replace the enterChat function
function enterChat() {
    const username = usernameInput.value.trim();
    const walletAddress = wallet.getAddress();
    const walletType = wallet.getProviderName();
    
    if (username && walletAddress) {
        _currentUser = {
            name: username,
            color: CONFIG.USER_COLORS[Math.floor(Math.random() * CONFIG.USER_COLORS.length)],
            wallet: walletAddress,
            provider: walletType
        };
        
        // Close login modal
        loginModal.style.display = 'none';
        
        // Enable chat functionality
        messageInput.disabled = false;
        sendButton.disabled = false;
        
        // Join chat via socket
        chatSocket.join({
            username: _currentUser.name,
            walletAddress: _currentUser.wallet,
            walletType: _currentUser.provider,
            color: _currentUser.color
        });
        
        // Save user profile
        if (window.appFunctions && window.appFunctions.saveUserProfile) {
            window.appFunctions.saveUserProfile(_currentUser.wallet, username);
        }
    } else {
        alert('Please enter a username and connect your wallet!');
    }
}

// Replace the sendMessage function
function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (messageText && _currentUser) {
        // Check for commands
        if (messageText.startsWith('/')) {
            handleCommand(messageText);
        } else {
            // Send message via socket
            chatSocket.sendMessage(messageText);
        }
        
        // Clear input
        messageInput.value = '';
    }
}

// Add handler for incoming messages
function handleIncomingMessage(message, isHistory = false) {
    // Determine if this is my message
    const isMyMessage = message.walletAddress === _currentUser.wallet;
    
    // Add message to chat
    addUserMessage({
        name: isMyMessage ? 'You' : message.username,
        color: message.color
    }, message.content);
    
    // Scroll to bottom for new messages (not history)
    if (!isHistory) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Add handler for user joined
function handleUserJoined(user) {
    addSystemMessage(`${user.username} has joined the chat!`);
}

// Add handler for user left
function handleUserLeft(user) {
    addSystemMessage(`${user.username} has left the chat.`);
}

// Update online users list
function updateOnlineUsers(users) {
    // Clear current users
    onlineUsersContainer.innerHTML = '';
    
    // Add each user
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('online-user');
        userElement.textContent = user.username;
        userElement.style.color = user.color;
        onlineUsersContainer.appendChild(userElement);
    });
}

// Handle user typing
function handleUserTyping(data) {
    // You can implement a typing indicator if desired
}
```

### 4. Enable Wallet Signature Verification

For proper wallet authentication, enhance the wallet connection to include message signing:

```javascript
// Add to wallet.js
function signMessage(message) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!_walletConnected) {
                throw new Error('Wallet not connected');
            }
            
            let signature;
            
            if (_provider === window.ethereum) {
                // Ethereum signature
                const accounts = await _provider.request({ method: 'eth_accounts' });
                if (accounts.length === 0) throw new Error('No accounts available');
                
                signature = await _provider.request({
                    method: 'personal_sign',
                    params: [message, accounts[0]]
                });
            } else if (_provider === window.solana) {
                // Solana signature (Phantom, etc.)
                const encodedMessage = new TextEncoder().encode(message);
                const signResult = await _provider.signMessage(encodedMessage, 'utf8');
                signature = signResult.signature;
            } else {
                throw new Error('Unsupported wallet provider');
            }
            
            resolve(signature);
        } catch (error) {
            console.error('Sign message error:', error);
            reject(error);
        }
    });
}

// Expose signMessage in the public API
return {
    init,
    connect,
    isConnected,
    getAddress,
    getProviderName,
    isMobileDevice,
    signMessage // Add this
};
```

Then update the chat.js file to use this for authentication:

```javascript
// In enterChat function
async function enterChat() {
    // ...existing code...
    
    try {
        // Sign a message to verify wallet ownership
        const message = `TropiChat Authentication\nTimestamp: ${Date.now()}\nWallet: ${_currentUser.wallet}`;
        const signature = await wallet.signMessage(message);
        
        // Join chat with signature
        chatSocket.join({
            username: _currentUser.name,
            walletAddress: _currentUser.wallet,
            walletType: _currentUser.provider,
            color: _currentUser.color,
            signature,
            message
        });
    } catch (error) {
        console.error('Authentication error:', error);
        alert('Error authenticating wallet. Please try again.');
    }
}
```

### 5. Deploy the Application

1. **Frontend**:
   - Update the SERVER_URL in socket-client.js to your production server
   - Deploy your static files to a hosting service like Netlify, Vercel, or GitHub Pages

2. **Backend**:
   - Deploy to a VPS or cloud service like AWS, DigitalOcean, or Heroku
   - Set up a MongoDB Atlas account for database hosting
   - Configure environment variables for production

## Optional Enhancements

### 1. Message Persistence
- Implement pagination for chat history
- Allow users to search past messages
- Add read receipts

### 2. User Profiles
- Let users set profile pictures (perhaps NFT avatars)
- Add user reputation/karma system
- Enable private messaging between users
- Implement user blocking functionality

### 3. Blockchain Integration
- Store message hashes on-chain for verification
- Create an NFT for chat membership
- Add token-gated chat rooms for specific NFT holders
- Implement tipping with cryptocurrency

### 4. Advanced Features
- File and image sharing with IPFS storage
- Voice/video messaging
- Encrypted messaging using the user's wallet keys
- Decentralized moderation system

## Scaling Considerations

As your chat application grows, consider these scaling strategies:

1. **Database Optimization**:
   - Implement database sharding for large user bases
   - Use caching (Redis) for frequently accessed data
   - Set up database indexes for common queries

2. **Server Scaling**:
   - Use a load balancer for multiple server instances
   - Implement Socket.io with Redis adapter for multi-server setups
   - Consider containerization with Docker and Kubernetes

3. **Message Delivery**:
   - Implement a message queue (RabbitMQ, Kafka) for reliable delivery
   - Set up webhooks for external integrations
   - Consider serverless functions for certain operations

## Security Considerations

1. **Wallet Security**:
   - Never store private keys or seed phrases
   - Use nonce-based challenges for authentication
   - Implement session timeouts

2. **Data Protection**:
   - Sanitize user inputs to prevent XSS attacks
   - Implement rate limiting to prevent spam
   - Set up proper CORS policies
   - Use HTTPS for all communications

3. **Moderation**:
   - Implement content filtering
   - Develop admin tools for moderation
   - Consider community-based reporting systems

## Testing Your Implementation

1. **Local Testing**:
   - Run both server and client locally
   - Use multiple browser windows to simulate different users
   - Test with different wallet types (MetaMask, Phantom, etc.)

2. **Mock Wallets for Testing**:
   - In development, you can use the wallet.js module's demo wallet
   - For testing, create multiple wallets in your test environment

## Example: Adding a Simple Wallet Signature Verification

Here's a simple implementation of wallet signature verification for the backend:

```javascript
// In server.js
const verifyWalletSignature = (message, signature, walletAddress) => {
  try {
    // For Ethereum wallets
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

// Then in the join handler
socket.on('join', async (userData) => {
  const { username, walletAddress, signature, message } = userData;
  
  // Verify signature if provided
  if (signature && message) {
    const isValid = verifyWalletSignature(message, signature, walletAddress);
    if (!isValid) {
      socket.emit('error', { message: 'Invalid wallet signature' });
      return;
    }
  }
  
  // Continue with join process...
});
```

## Troubleshooting Common Issues

### Socket Connection Problems

1. **Cross-Origin Issues**:
   ```javascript
   // In server.js, ensure proper CORS setup
   const io = socketIo(server, {
     cors: {
       origin: '*', // In production, restrict to your domain
       methods: ['GET', 'POST']
     }
   });
   ```

2. **Connection Timeouts**:
   ```javascript
   // In socket-client.js
   function connectSocket() {
     try {
       _socket = io(SERVER_URL, {
         reconnectionAttempts: 5,
         timeout: 10000
       });
       
       // Rest of connection code...
     } catch (error) {
       console.error('Socket connection error:', error);
     }
   }
   ```

### Wallet Connection Issues

1. **Mobile Deep Link Problems**:
   If mobile deep links aren't working properly, provide a manual connection option:
   ```javascript
   // In the mobile wallet selector UI
   walletStatus.innerHTML += `
     <div style="margin-top: 15px;">
       <button id="manual-connect" class="glow-button">
         Connect Manually
       </button>
     </div>
   `;
   
   document.getElementById('manual-connect').addEventListener('click', useDemoWallet);
   ```

2. **Wallet Detection Issues**:
   ```javascript
   // Add more robust wallet detection in wallet.js
   function detectWalletProviders() {
     // Check for injected providers with different property names
     const providers = [];
     
     if (window.ethereum) providers.push('ethereum');
     if (window.web3?.currentProvider) providers.push('web3');
     if (window.solana) providers.push('solana');
     if (window.solflare) providers.push('solflare');
     if (window.phantom) providers.push('phantom');
     
     return providers;
   }
   ```

## Conclusion

By following this guide, you can transform your front-end TropiChat demo into a fully functional multi-user chat application. The implementation provides a solid foundation with real-time messaging, wallet authentication, and user presence tracking.

For production applications, consider additional features like message encryption, content moderation, and robust error handling. You might also want to explore decentralized alternatives to traditional backends, such as using IPFS for message storage or smart contracts for access control.

Remember that web3 applications are still evolving, and wallet interfaces may change over time. Stay updated with the latest wallet API changes and maintain your application accordingly.

## Resources

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Ethereum Web3.js Documentation](https://web3js.readthedocs.io/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [ethers.js Documentation](https://docs.ethers.io/)
- [Express.js Documentation](https://expressjs.com/)