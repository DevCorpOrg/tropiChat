/**
 * Main application file for TropiChat
 * Initializes all modules and handles their interactions
 */
(function() {
    // Application state
    let appState = {
        initialized: false,
        walletConnected: false,
        userLoggedIn: false,
        debug: true // Enable debug mode
    };
    
    // Initialize the application when the DOM is loaded
    document.addEventListener('DOMContentLoaded', initApp);
    
    /**
     * Initialize the application
     */
    function initApp() {
        console.log(`${CONFIG.APP_NAME} is initializing...`);
        
        // Debug browser environment
        debugBrowserInfo();
        
        // Initialize wallet module with callback
        wallet.init(onWalletConnected);
        
        // Initialize chat module
        chat.init();
        
        // Update UI for mobile if needed
        if (wallet.isMobileDevice()) {
            updateForMobile();
        }
        
        appState.initialized = true;
        console.log(`${CONFIG.APP_NAME} initialization complete.`);
    }
    
    /**
     * Update UI for mobile devices
     */
    function updateForMobile() {
        // Add mobile-specific classes to body
        document.body.classList.add('mobile-device');
        
        // Update login button text
        const connectButton = document.getElementById('connect-wallet');
        if (connectButton) {
            connectButton.innerText = 'Connect Mobile Wallet';
        }
        
        // Update welcome message
        const welcomeText = document.querySelector('.login-box p:first-of-type');
        if (welcomeText) {
            welcomeText.innerText = 'Connect your mobile wallet to chat!';
        }
        
        console.log("UI updated for mobile device");
    }
    
    /**
     * Log browser and wallet information for debugging
     */
    function debugBrowserInfo() {
        if (!appState.debug) return;
        
        console.log("Browser information:");
        console.log("User Agent:", navigator.userAgent);
        console.log("window.ethereum:", typeof window.ethereum !== 'undefined');
        console.log("window.solana:", typeof window.solana !== 'undefined');
        
        try {
            // Log ethereum details if available
            if (typeof window.ethereum !== 'undefined') {
                console.log("Ethereum provider details:");
                console.log("- isMetaMask:", window.ethereum.isMetaMask);
                console.log("- isBraveWallet:", window.ethereum.isBraveWallet);
                console.log("- isCoinbaseWallet:", window.ethereum.isCoinbaseWallet);
                
                // Try to get the chainId
                window.ethereum.request({ method: 'eth_chainId' })
                    .then(chainId => {
                        console.log("- Chain ID:", chainId);
                    })
                    .catch(err => {
                        console.log("- Error getting chainId:", err.message);
                    });
            }
            
            // Log solana details if available
            if (typeof window.solana !== 'undefined') {
                console.log("Solana provider details:");
                console.log("- isPhantom:", window.solana.isPhantom);
                console.log("- connect method:", typeof window.solana.connect === 'function');
            }
        } catch (error) {
            console.warn("Error logging wallet details:", error);
        }
    }
    
    /**
     * Callback for when wallet is connected
     * @param {String} address - Wallet address
     * @param {String} providerName - Provider name (MetaMask, Phantom, etc.)
     */
    function onWalletConnected(address, providerName) {
        console.log(`Wallet connected: ${address} (${providerName})`);
        appState.walletConnected = true;
        
        // Check if user has a saved profile
        checkUserProfile(address);
    }
    
    /**
     * Check if user has a saved profile
     * @param {String} address - Wallet address
     */
    function checkUserProfile(address) {
        // In a real implementation, this would check a database or blockchain
        // For now, we'll check localStorage as an example
        const savedProfile = localStorage.getItem(`tropichat_user_${address}`);
        
        if (savedProfile) {
            try {
                const profile = JSON.parse(savedProfile);
                console.log(`Found saved profile for ${profile.username}`);
                
                // Auto-fill the username field
                const usernameInput = document.getElementById('username-input');
                if (usernameInput) {
                    usernameInput.value = profile.username;
                }
            } catch (e) {
                console.error("Error parsing saved profile", e);
            }
        }
    }
    
    /**
     * Save user profile
     * @param {String} address - Wallet address
     * @param {String} username - Username
     */
    function saveUserProfile(address, username) {
        const profile = {
            username: username,
            lastLogin: new Date().toISOString()
        };
        
        localStorage.setItem(`tropichat_user_${address}`, JSON.stringify(profile));
    }
    
    // Expose necessary functions to window scope for callbacks
    window.appFunctions = {
        saveUserProfile,
        updateForMobile
    };
    
})();