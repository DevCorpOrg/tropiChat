/**
 * Socket client for TropiChat
 * Handles real-time communication with the server
 */
const chatSocket = (function() {
    // Private variables
    let _socket = null;
    let _connected = false;
    let _currentUser = null;
    let _messageCallbacks = [];
    let _userJoinedCallbacks = [];
    let _userLeftCallbacks = [];
    let _activeUsersCallbacks = [];
    let _typingCallbacks = [];
    let _errorCallbacks = [];
    
    // Server URL - change this to your server address
    const SERVER_URL = 'http://localhost:3000';
    
    /**
     * Initialize socket connection
     */
    function init() {
        console.log('Initializing socket connection...');
        
        // Load socket.io client from CDN if not already loaded
        if (typeof io === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
            script.onload = connectSocket;
            document.head.appendChild(script);
        } else {
            connectSocket();
        }
    }
    
    /**
     * Connect to socket server
     */
    function connectSocket() {
        try {
            _socket = io(SERVER_URL);
            
            // Set up event listeners
            _socket.on('connect', handleConnect);
            _socket.on('disconnect', handleDisconnect);
            _socket.on('error', handleError);
            _socket.on('chat-message', handleMessage);
            _socket.on('user-joined', handleUserJoined);
            _socket.on('user-left', handleUserLeft);
            _socket.on('active-users', handleActiveUsers);
            _socket.on('user-typing', handleUserTyping);
            _socket.on('welcome', handleWelcome);
            _socket.on('message-history', handleMessageHistory);
            
            console.log('Socket connection initialized');
        } catch (error) {
            console.error('Socket connection error:', error);
            
            // Fall back to mock mode for development/testing
            console.log('Falling back to mock mode');
            _connected = true;
            mockUserJoined();
        }
    }
    
    /**
     * Handle socket connection
     */
    function handleConnect() {
        console.log('Socket connected');
        _connected = true;
    }
    
    /**
     * Handle socket disconnection
     */
    function handleDisconnect() {
        console.log('Socket disconnected');
        _connected = false;
    }
    
    /**
     * Handle socket error
     * @param {Object} error - Error data
     */
    function handleError(error) {
        console.error('Socket error:', error);
        
        // Notify all error callbacks
        _errorCallbacks.forEach(callback => {
            try {
                callback(error);
            } catch (err) {
                console.error('Error callback error:', err);
            }
        });
    }
    
    /**
     * Handle chat message
     * @param {Object} message - Message data
     */
    function handleMessage(message) {
        console.log('Received message:', message);
        
        // Notify all message callbacks
        _messageCallbacks.forEach(callback => {
            try {
                callback(message);
            } catch (err) {
                console.error('Message callback error:', err);
            }
        });
    }
    
    /**
     * Handle user joined
     * @param {Object} user - User data
     */
    function handleUserJoined(user) {
        console.log('User joined:', user);
        
        // Notify all user joined callbacks
        _userJoinedCallbacks.forEach(callback => {
            try {
                callback(user);
            } catch (err) {
                console.error('User joined callback error:', err);
            }
        });
    }
    
    /**
     * Handle user left
     * @param {Object} user - User data
     */
    function handleUserLeft(user) {
        console.log('User left:', user);
        
        // Notify all user left callbacks
        _userLeftCallbacks.forEach(callback => {
            try {
                callback(user);
            } catch (err) {
                console.error('User left callback error:', err);
            }
        });
    }
    
    /**
     * Handle active users list
     * @param {Array} users - List of active users
     */
    function handleActiveUsers(users) {
        console.log('Active users:', users);
        
        // Notify all active users callbacks
        _activeUsersCallbacks.forEach(callback => {
            try {
                callback(users);
            } catch (err) {
                console.error('Active users callback error:', err);
            }
        });
    }
    
    /**
     * Handle user typing
     * @param {Object} data - Typing data
     */
    function handleUserTyping(data) {
        // Notify all typing callbacks
        _typingCallbacks.forEach(callback => {
            try {
                callback(data);
            } catch (err) {
                console.error('Typing callback error:', err);
            }
        });
    }
    
    /**
     * Handle welcome message
     * @param {Object} data - Welcome data
     */
    function handleWelcome(data) {
        console.log('Welcome data:', data);
        
        // Store current user
        _currentUser = data.user;
    }
    
    /**
     * Handle message history
     * @param {Array} messages - Message history
     */
    function handleMessageHistory(messages) {
        console.log('Message history:', messages);
        
        // Notify all message callbacks with history flag
        messages.forEach(message => {
            _messageCallbacks.forEach(callback => {
                try {
                    callback(message, true); // Second param indicates history message
                } catch (err) {
                    console.error('Message history callback error:', err);
                }
            });
        });
    }
    
    /**
     * Join chat with user data
     * @param {Object} userData - User data
     */
    function join(userData) {
        if (!_connected) {
            console.warn('Socket not connected');
            mockUserJoined();
            return;
        }
        
        console.log('Joining chat with user data:', userData);
        _socket.emit('join', userData);
    }
    
    /**
     * Send a chat message
     * @param {String} content - Message content
     */
    function sendMessage(content) {
        if (!_connected) {
            console.warn('Socket not connected');
            mockMessage(content);
            return;
        }
        
        if (!_currentUser) {
            console.warn('Not authenticated');
            return;
        }
        
        console.log('Sending message:', content);
        _socket.emit('chat-message', { content });
    }
    
    /**
     * Send typing indicator
     * @param {Boolean} isTyping - Whether user is typing
     */
    function sendTyping(isTyping) {
        if (!_connected || !_currentUser) return;
        
        _socket.emit('typing', isTyping);
    }
    
    /**
     * Mock user joined (for development/testing)
     */
    function mockUserJoined() {
        // Create some mock users
        const mockUsers = [
            { username: 'SurfDude92', color: '#FF5733' },
            { username: 'BeachGirl', color: '#33FF57' },
            { username: 'TropicalStorm', color: '#3357FF' },
            { username: 'CoconutLover', color: '#FF33A6' }
        ];
        
        // Notify active users callbacks
        _activeUsersCallbacks.forEach(callback => {
            try {
                callback(mockUsers);
            } catch (err) {
                console.error('Mock active users callback error:', err);
            }
        });
        
        // Simulate some users joining
        setTimeout(() => {
            handleUserJoined({
                username: 'IslandHopper',
                color: '#33FFF5',
                timestamp: new Date()
            });
        }, 3000);
        
        setTimeout(() => {
            handleUserJoined({
                username: 'WaveRider',
                color: '#F5FF33',
                timestamp: new Date()
            });
        }, 8000);
    }
    
    /**
     * Mock message (for development/testing)
     * @param {String} content - Message content
     */
    function mockMessage(content) {
        // Add the user's message
        const myMessage = {
            id: Date.now(),
            content,
            username: 'You',
            color: '#00ffff',
            timestamp: new Date()
        };
        
        handleMessage(myMessage);
        
        // Simulate a response
        setTimeout(() => {
            const mockResponses = [
                'That\'s cool!',
                'Nice to meet you!',
                'How\'s the weather there?',
                'I love this retro chat!',
                'Anyone here like surfing?',
                'This reminds me of the 90s internet!',
                'LOL 😂',
                'Awesome! 🌴'
            ];
            
            const mockUsers = [
                { username: 'SurfDude92', color: '#FF5733' },
                { username: 'BeachGirl', color: '#33FF57' },
                { username: 'TropicalStorm', color: '#3357FF' },
                { username: 'CoconutLover', color: '#FF33A6' }
            ];
            
            const randomUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
            const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
            
            const mockMessage = {
                id: Date.now() + 1,
                content: randomResponse,
                username: randomUser.username,
                color: randomUser.color,
                timestamp: new Date()
            };
            
            handleMessage(mockMessage);
        }, 1000 + Math.random() * 2000);
    }
    
    /**
     * Register a callback for chat messages
     * @param {Function} callback - Callback function
     */
    function onMessage(callback) {
        _messageCallbacks.push(callback);
    }
    
    /**
     * Register a callback for user joined
     * @param {Function} callback - Callback function
     */
    function onUserJoined(callback) {
        _userJoinedCallbacks.push(callback);
    }
    
    /**
     * Register a callback for user left
     * @param {Function} callback - Callback function
     */
    function onUserLeft(callback) {
        _userLeftCallbacks.push(callback);
    }
    
    /**
     * Register a callback for active users
     * @param {Function} callback - Callback function
     */
    function onActiveUsers(callback) {
        _activeUsersCallbacks.push(callback);
    }
    
    /**
     * Register a callback for user typing
     * @param {Function} callback - Callback function
     */
    function onTyping(callback) {
        _typingCallbacks.push(callback);
    }
    
    /**
     * Register a callback for errors
     * @param {Function} callback - Callback function
     */
    function onError(callback) {
        _errorCallbacks.push(callback);
    }
    
    /**
     * Check if socket is connected
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
        join,
        sendMessage,
        sendTyping,
        onMessage,
        onUserJoined,
        onUserLeft,
        onActiveUsers,
        onTyping,
        onError,
        isConnected,
        getCurrentUser
    };
})();