/**
 * Configuration settings for TropiChat
 */
const CONFIG = {
    // App settings
    APP_NAME: 'TropiChat',
    
    // Mock users for simulation
    MOCK_USERS: [
        'SurfDude92', 
        'BeachGirl', 
        'TropicalStorm', 
        'CoconutLover',
        'IslandHopper', 
        'WaveRider', 
        'SunnyDayz'
    ],
    
    // User colors for chat display
    USER_COLORS: [
        '#FF5733', '#33FF57', '#3357FF', '#FF33A6', '#33FFF5',
        '#F5FF33', '#FF5733', '#C70039', '#900C3F', '#FFC300'
    ],
    
    // Mock responses for simulated users
    MOCK_RESPONSES: [
        'Hey {username}, nice to meet you!',
        'I agree with what {username} said.',
        'Has anyone been to the beach today?',
        '{username}, that\'s interesting! Tell us more.',
        'Welcome to TropiChat {username}! 🌴',
        'Cool! 🏄‍♂️',
        'lol 😂',
        'brb getting a tropical drink 🍹'
    ],
    
    // Available chat commands
    COMMANDS: {
        HELP: '/help',
        CLEAR: '/clear',
        SHRUG: '/shrug',
        ME: '/me',
        COLOR: '/color'
    },
    
    // System messages
    SYSTEM_MESSAGES: {
        WELCOME: 'Welcome to TropiChat! Please be respectful to all users.',
        HELP_COMMAND: 'Available commands: /help, /clear, /shrug, /me [action], /color [hex]',
        CLEAR_COMMAND: 'Chat cleared.',
        COLOR_CHANGED: 'Your color has been changed.',
        INVALID_COLOR: 'Invalid color format. Use hexadecimal: /color #FF5733',
        UNKNOWN_COMMAND: 'Unknown command: {command}'
    },
    
    // Chat simulation settings
    SIMULATION: {
        RESPONSE_CHANCE: 0.25,
        MIN_DELAY: 1000,
        MAX_DELAY: 3000
    }
};