/**
 * Chat functionality module for TropiChat
 * Updated to work with Socket.io for multi-user functionality
 */
const chat = (function() {
    // Private variables
    let _currentUser = null;
    let _typingTimeout = null;
    let _isTyping = false;
    
    // DOM elements
    const loginModal = document.getElementById('login-modal');
    const usernameInput = document.getElementById('username-input');
    const enterChatBtn = document.getElementById('enter-chat');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const onlineUsersContainer = document.getElementById('online-users');
    
    /**
     * Initialize chat module
     */
    function init() {
        // Event listeners
        enterChatBtn.addEventListener('click', enterChat);
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // Add typing indicator event
        messageInput.addEventListener('input', handleTypingInput);
        
        // Initialize socket connection
        if (typeof chatSocket !== 'undefined') {
            chatSocket.init();
            
            // Set up socket event handlers
            chatSocket.onMessage(handleIncomingMessage);
            chatSocket.onUserJoined(handleUserJoined);
            chatSocket.onUserLeft(handleUserLeft);
            chatSocket.onActiveUsers(updateOnlineUsers);
            chatSocket.onTyping(handleUserTyping);
            chatSocket.onError(handleSocketError);
            
            console.log('Chat module initialized with socket connection');
        } else {
            console.log('Chat module initialized in standalone mode');
            
            // Show welcome messages in standalone mode
            addSystemMessage(CONFIG.SYSTEM_MESSAGES.WELCOME);
            addSystemMessage("Type /help for available commands.");
            
            // Populate mock users in standalone mode
            populateMockUsers();
        }
    }
    
    /**
     * Handle typing input for typing indicator
     */
    function handleTypingInput() {
        // Only send typing events if we have a socket connection
        if (typeof chatSocket === 'undefined' || !chatSocket.isConnected()) return;
        
        // If not currently typing, send typing start
        if (!_isTyping) {
            _isTyping = true;
            chatSocket.sendTyping(true);
        }
        
        // Clear existing timeout
        if (_typingTimeout) {
            clearTimeout(_typingTimeout);
        }
        
        // Set timeout to stop typing indicator after 2 seconds
        _typingTimeout = setTimeout(() => {
            _isTyping = false;
            chatSocket.sendTyping(false);
        }, 2000);
    }
    
    /**
     * Add mock users to the online users list (standalone mode)
     */
    function populateMockUsers() {
        CONFIG.MOCK_USERS.forEach(user => {
            const randomColor = CONFIG.USER_COLORS[Math.floor(Math.random() * CONFIG.USER_COLORS.length)];
            const userElement = document.createElement('div');
            userElement.classList.add('online-user');
            userElement.textContent = user;
            userElement.style.color = randomColor;
            onlineUsersContainer.appendChild(userElement);
        });
    }
    
    /**
     * Enter chat with username
     */
    async function enterChat() {
        const username = usernameInput.value.trim();
        
        if (username) {
            // Get wallet address and provider if available
            const address = typeof wallet !== 'undefined' ? wallet.getAddress() : null;
            const walletProvider = typeof wallet !== 'undefined' ? wallet.getProviderName() : 'Demo Wallet';
            
            // Create user object
            _currentUser = {
                name: username,
                color: CONFIG.USER_COLORS[Math.floor(Math.random() * CONFIG.USER_COLORS.length)],
                wallet: address || '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                provider: walletProvider
            };
            
            // Close login modal
            loginModal.style.display = 'none';
            
            // Enable chat functionality
            messageInput.disabled = false;
            sendButton.disabled = false;
            
            try {
                // If we have a socket connection and wallet, use proper authentication
                if (typeof chatSocket !== 'undefined' && chatSocket.isConnected() && 
                    typeof wallet !== 'undefined' && wallet.isConnected()) {
                    
                    // Try to sign a message for authentication if supported
                    let signature = null;
                    let message = null;
                    
                    if (typeof wallet.signMessage === 'function') {
                        try {
                            message = `TropiChat Authentication\nTimestamp: ${Date.now()}\nWallet: ${_currentUser.wallet}`;
                            signature = await wallet.signMessage(message);
                            console.log('Signed authentication message');
                        } catch (error) {
                            console.warn('Could not sign message:', error);
                        }
                    }
                    
                    // Join chat via socket
                    chatSocket.join({
                        username: _currentUser.name,
                        walletAddress: _currentUser.wallet,
                        walletType: _currentUser.provider,
                        color: _currentUser.color,
                        signature,
                        message
                    });
                } else {
                    // Standalone mode - add user to UI directly
                    
                    // Add user to online users
                    const userElement = document.createElement('div');
                    userElement.classList.add('online-user');
                    userElement.textContent = _currentUser.name;
                    userElement.style.color = _currentUser.color;
                    onlineUsersContainer.appendChild(userElement);
                    
                    // Announce user joined
                    addSystemMessage(`${_currentUser.name} has joined the chat!`);
                }
            } catch (error) {
                console.error('Error joining chat:', error);
                addSystemMessage(`Error joining chat: ${error.message}`);
            }
            
            // Save user profile if the app has this function available
            if (window.appFunctions && window.appFunctions.saveUserProfile) {
                window.appFunctions.saveUserProfile(_currentUser.wallet, username);
            }
        } else {
            alert('Please enter a username!');
        }
    }
    
    /**
     * Add a system message to the chat
     * @param {String} text - Message text
     */
    function addSystemMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('username');
        usernameSpan.style.color = '#ffcc00';
        usernameSpan.textContent = CONFIG.APP_NAME + ':';
        
        const messageText = document.createElement('span');
        messageText.textContent = ' ' + text;
        
        messageElement.appendChild(usernameSpan);
        messageElement.appendChild(messageText);
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Add a user message to the chat
     * @param {Object} user - User object
     * @param {String} text - Message text
     */
    function addUserMessage(user, text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('username');
        usernameSpan.style.color = user.color;
        usernameSpan.textContent = user.name + ':';
        
        const messageText = document.createElement('span');
        messageText.innerHTML = ' ' + formatMessage(text);
        
        messageElement.appendChild(usernameSpan);
        messageElement.appendChild(messageText);
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    /**
     * Format message - convert URLs to links, etc.
     * @param {String} text - Message text
     * @returns {String} - Formatted message
     */
    function formatMessage(text) {
        // Convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, function(url) {
            return `<a href="${url}" target="_blank" style="color: #00ffff;">${url}</a>`;
        });
    }
    
    /**
     * Send a message
     */
    function sendMessage() {
        const messageText = messageInput.value.trim();
        
        if (messageText && _currentUser) {
            // Check for commands
            if (messageText.startsWith('/')) {
                handleCommand(messageText);
            } else {
                // If we have a socket connection, send via socket
                if (typeof chatSocket !== 'undefined' && chatSocket.isConnected()) {
                    chatSocket.sendMessage(messageText);
                } else {
                    // Standalone mode - add message directly and simulate responses
                    addUserMessage(_currentUser, messageText);
                    simulateMockResponses();
                }
            }
            
            // Clear input
            messageInput.value = '';
        }
    }
    
    /**
     * Handle chat commands
     * @param {String} command - Command text
     */
    function handleCommand(command) {
        const cmd = command.toLowerCase();
        
        if (cmd === CONFIG.COMMANDS.HELP) {
            addSystemMessage(CONFIG.SYSTEM_MESSAGES.HELP_COMMAND);
        } else if (cmd === CONFIG.COMMANDS.CLEAR) {
            chatMessages.innerHTML = '';
            addSystemMessage(CONFIG.SYSTEM_MESSAGES.CLEAR_COMMAND);
        } else if (cmd === CONFIG.COMMANDS.SHRUG) {
            addUserMessage(_currentUser, '¯\\_(ツ)_/¯');
        } else if (cmd.startsWith(CONFIG.COMMANDS.ME + ' ')) {
            const action = command.substring(4);
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.style.color = '#ff00ff';
            messageElement.textContent = `* ${_currentUser.name} ${action}`;
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else if (cmd.startsWith(CONFIG.COMMANDS.COLOR + ' ')) {
            const color = command.substring(7);
            if (color.match(/^#[0-9A-F]{6}$/i)) {
                _currentUser.color = color;
                addSystemMessage(CONFIG.SYSTEM_MESSAGES.COLOR_CHANGED);
            } else {
                addSystemMessage(CONFIG.SYSTEM_MESSAGES.INVALID_COLOR);
            }
        } else {
            addSystemMessage(CONFIG.SYSTEM_MESSAGES.UNKNOWN_COMMAND.replace('{command}', command));
        }
    }
    
    /**
     * Simulate responses from mock users
     */
    function simulateMockResponses() {
        // Simulate responses with configured chance
        if (Math.random() < CONFIG.SIMULATION.RESPONSE_CHANCE) {
            setTimeout(() => {
                const randomUser = CONFIG.MOCK_USERS[Math.floor(Math.random() * CONFIG.MOCK_USERS.length)];
                const randomColor = CONFIG.USER_COLORS[Math.floor(Math.random() * CONFIG.USER_COLORS.length)];
                const randomResponseTemplate = CONFIG.MOCK_RESPONSES[Math.floor(Math.random() * CONFIG.MOCK_RESPONSES.length)];
                const randomResponse = randomResponseTemplate.replace('{username}', _currentUser.name);
                
                addUserMessage({name: randomUser, color: randomColor}, randomResponse);
            }, CONFIG.SIMULATION.MIN_DELAY + Math.random() * (CONFIG.SIMULATION.MAX_DELAY - CONFIG.SIMULATION.MIN_DELAY));
        }
    }
    
    /**
     * Add emoji to message input
     * @param {String} emoji - Emoji character
     */
    function addEmoji(emoji) {
        if (!messageInput.disabled) {
            messageInput.value += emoji;
            messageInput.focus();
        }
    }
    
    /**
     * Handle incoming message from socket
     * @param {Object} message - Message data
     * @param {Boolean} isHistory - Whether this is a history message
     */
    function handleIncomingMessage(message, isHistory = false) {
        // Check if this is our own message or from another user
        const isOwnMessage = message.walletAddress === _currentUser.wallet;
        
        // Create display name
        const displayName = isOwnMessage ? 'You' : message.username;
        
        // Add message to chat
        addUserMessage({
            name: displayName,
            color: message.color || (isOwnMessage ? _currentUser.color : '#FFFFFF')
        }, message.content);
        
        // Only scroll for non-history messages
        if (!isHistory) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
    
    /**
     * Handle user joined event from socket
     * @param {Object} data - User data
     */
    function handleUserJoined(data) {
        addSystemMessage(`${data.username} has joined the chat!`);
    }
    
    /**
     * Handle user left event from socket
     * @param {Object} data - User data
     */
    function handleUserLeft(data) {
        addSystemMessage(`${data.username} has left the chat.`);
    }
    
    /**
     * Update online users list from socket data
     * @param {Array} users - Array of user objects
     */
    function updateOnlineUsers(users) {
        // Clear current list
        onlineUsersContainer.innerHTML = '';
        
        // Add current users
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.classList.add('online-user');
            userElement.textContent = user.username;
            userElement.style.color = user.color || '#FFFFFF';
            onlineUsersContainer.appendChild(userElement);
        });
    }
    
    /**
     * Handle user typing event from socket
     * @param {Object} data - Typing data
     */
    function handleUserTyping(data) {
        // Check if typing indicator element exists
        let typingIndicator = document.getElementById('typing-indicator');
        
        if (data.isTyping) {
            // Create or update typing indicator
            if (!typingIndicator) {
                typingIndicator = document.createElement('div');
                typingIndicator.id = 'typing-indicator';
                typingIndicator.classList.add('typing-indicator');
                typingIndicator.innerHTML = `<span></span><span></span><span></span>`;
                typingIndicator.style.display = 'none';
                chatMessages.appendChild(typingIndicator);
            }
            
            // Show typing indicator with username
            typingIndicator.textContent = `${data.username} is typing...`;
            typingIndicator.style.display = 'block';
        } else if (typingIndicator) {
            // Hide typing indicator
            typingIndicator.style.display = 'none';
        }
    }
    
    /**
     * Handle socket error
     * @param {Object} error - Error data
     */
    function handleSocketError(error) {
        console.error('Socket error:', error);
        addSystemMessage(`Error: ${error.message || 'Unknown error'}`);
    }
    
    /**
     * Get current user
     * @returns {Object} - Current user object
     */
    function getCurrentUser() {
        return _currentUser;
    }
    
    // Public API
    return {
        init,
        enterChat,
        addSystemMessage,
        addUserMessage,
        sendMessage,
        addEmoji,
        getCurrentUser
    };
})();