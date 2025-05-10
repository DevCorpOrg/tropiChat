/**
 * Wallet connection module for TropiChat
 * Supports both desktop browser extensions and mobile wallet apps
 */
const wallet = (function() {
    // Private variables
    let _walletAddress = null;
    let _walletConnected = false;
    let _onConnectedCallback = null;
    let _providerName = null;
    let _isMobile = false;
    
    // DOM elements
    const connectWalletBtn = document.getElementById('connect-wallet');
    const walletStatus = document.getElementById('wallet-status');
    const usernameContainer = document.getElementById('username-container');
    
    /**
     * Initialize wallet module
     * @param {Function} onConnectedCallback - Callback to execute when wallet is connected
     */
    function init(onConnectedCallback) {
        _onConnectedCallback = onConnectedCallback;
        
        // Check if we're on mobile
        _isMobile = checkIfMobile();
        console.log("Is mobile device:", _isMobile);
        
        // Event listeners
        if (connectWalletBtn) {
            connectWalletBtn.addEventListener('click', connect);
        } else {
            console.error("Connect wallet button not found");
        }
        
        // Simple test to see if any wallet is available
        checkForWallets();
    }
    
    /**
     * Check if device is mobile
     * @returns {Boolean} - True if device is mobile
     */
    function checkIfMobile() {
        let check = false;
        (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
        return check;
    }
    
    /**
     * Check if any wallet is available
     * Just a simple check to update the UI accordingly
     */
    function checkForWallets() {
        // Check for standard Ethereum providers
        const hasEthereum = typeof window.ethereum !== 'undefined';
        
        // Check for Solana providers
        const hasSolana = typeof window.solana !== 'undefined' && typeof window.solana.connect === 'function';
        
        // Check for wallet connect
        const hasWalletConnect = typeof window.WalletConnectProvider !== 'undefined';
        
        // Check for Web3 (older implementation)
        const hasWeb3 = typeof window.web3 !== 'undefined';
        
        // Check for specific browser wallets
        const hasBraveWallet = !!navigator.brave || (hasEthereum && window.ethereum.isBraveWallet);
        const hasFirefoxWallet = navigator.userAgent.indexOf("Firefox") != -1 && (hasEthereum || hasWeb3);
        
        console.log("Wallet check:", { 
            hasEthereum, 
            hasSolana, 
            hasWalletConnect,
            hasWeb3,
            hasBraveWallet,
            hasFirefoxWallet,
            isMobile: _isMobile
        });
        
        // For mobile, always assume wallets are available through deep links
        if (_isMobile) {
            return true;
        }
        
        // Update UI based on wallet availability for desktop
        if (walletStatus && !hasEthereum && !hasSolana && !hasWalletConnect && !hasWeb3) {
            walletStatus.innerHTML = `
                <p style="color: #ffaa00;">No wallet detected on desktop. You need to install a wallet to join the chat.</p>
            `;
        }
        
        return hasEthereum || hasSolana || hasWalletConnect || hasWeb3 || hasBraveWallet || hasFirefoxWallet;
    }
    
    /**
     * Connect to any available wallet
     * This handles both desktop browser extensions and mobile wallet apps
     */
    async function connect() {
        // Show connecting state
        if (walletStatus) {
            walletStatus.innerHTML = `
                <p style="color: #ffcc00;">Connecting to wallet...</p>
                <div class="spinner"></div>
            `;
        }
        
        // Add spinner style if not already present
        if (!document.getElementById('wallet-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'wallet-spinner-style';
            style.textContent = `
                .spinner {
                    margin: 10px auto;
                    width: 30px;
                    height: 30px;
                    border: 3px solid #00ffff;
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spinner 1s linear infinite;
                }
                @keyframes spinner {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        try {
            // If on mobile, show mobile wallet options
            if (_isMobile) {
                showMobileWalletOptions();
                return;
            }
            
            // First try Ethereum wallets (most common)
            if (typeof window.ethereum !== 'undefined') {
                await connectEthereumWallet();
                return;
            }
            
            // Then try Solana wallets (like Phantom)
            if (typeof window.solana !== 'undefined' && typeof window.solana.connect === 'function') {
                await connectSolanaWallet();
                return;
            }
            
            // If we get here, no wallet was available on desktop
            if (walletStatus) {
                walletStatus.innerHTML = `
                    <p style="color: #ff0000;">No wallet found. Please install one of these:</p>
                    <div style="display: flex; justify-content: center; margin-top: 10px;">
                        <a href="https://metamask.io/download/" target="_blank" style="margin: 0 5px;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                                 alt="MetaMask" style="width: 30px; height: 30px;">
                        </a>
                        <a href="https://phantom.app/download" target="_blank" style="margin: 0 5px;">
                            <img src="https://www.gitbook.com/cdn-cgi/image/width=40,height=40,fit=contain,dpr=2,format=auto/https%3A%2F%2F4022901204-files.gitbook.io%2F~%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F-MU27jC4gReVdpHQjfbd%252Ficon%252F68szorVVwlQjEpEsW3zy%252FGroup%25201030.png%3Falt%3Dmedia%26token%3Da3a5a933-7009-4e5e-9ca6-79285d1bd5f7" 
                                 alt="Phantom" style="width: 30px; height: 30px;">
                        </a>
                        <a href="https://www.coinbase.com/wallet/downloads" target="_blank" style="margin: 0 5px;">
                            <img src="https://altcoinsbox.com/wp-content/uploads/2023/03/coinbase-wallet-logo.png" 
                                 alt="Coinbase Wallet" style="width: 30px; height: 30px;">
                        </a>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Wallet connection error:", error);
            
            if (walletStatus) {
                walletStatus.innerHTML = `
                    <p style="color: #ff0000;">Connection error: ${error.message || "Unknown error"}</p>
                    <button id="retry-connect" style="margin-top: 10px;">Try Again</button>
                `;
                
                // Add retry button event listener
                const retryButton = document.getElementById('retry-connect');
                if (retryButton) {
                    retryButton.addEventListener('click', connect);
                }
            }
        }
    }
    
    /**
     * Show mobile wallet options
     * Presents a selection of wallet apps with deep links
     */
    function showMobileWalletOptions() {
        if (walletStatus) {
            walletStatus.innerHTML = `
                <p style="color: #00ffff;">Select your wallet app:</p>
                <div class="mobile-wallets">
                    <div class="wallet-option" id="metamask-mobile">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask">
                        <span>MetaMask</span>
                    </div>
                    <div class="wallet-option" id="phantom-mobile">
                        <img src="https://www.gitbook.com/cdn-cgi/image/width=40,height=40,fit=contain,dpr=2,format=auto/https%3A%2F%2F4022901204-files.gitbook.io%2F~%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F-MU27jC4gReVdpHQjfbd%252Ficon%252F68szorVVwlQjEpEsW3zy%252FGroup%25201030.png%3Falt%3Dmedia%26token%3Da3a5a933-7009-4e5e-9ca6-79285d1bd5f7" alt="Phantom">
                        <span>Phantom</span>
                    </div>
                    <div class="wallet-option" id="coinbase-mobile">
                        <img src="https://altcoinsbox.com/wp-content/uploads/2023/03/coinbase-wallet-logo.png" alt="Coinbase">
                        <span>Coinbase</span>
                    </div>
                    <div class="wallet-option" id="trust-mobile">
                        <img src="https://trustwallet.com/assets/images/media/assets/trust_platform.png" alt="Trust Wallet">
                        <span>Trust</span>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 15px;">
                    <button id="demo-wallet-button" class="glow-button">Continue with Demo Wallet</button>
                </div>
                <p style="font-size: 11px; margin-top: 15px; color: #999999;">
                    Don't have a wallet? 
                    <a href="https://metamask.io/download/" target="_blank" style="color: #00ffff;">Get MetaMask</a>
                </p>
            `;
            
            // Add style for mobile wallet options if not already present
            if (!document.getElementById('mobile-wallet-style')) {
                const style = document.createElement('style');
                style.id = 'mobile-wallet-style';
                style.textContent = `
                    .mobile-wallets {
                        display: flex;
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 10px;
                        margin-top: 15px;
                    }
                    .wallet-option {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        width: 80px;
                        padding: 10px;
                        border-radius: 10px;
                        background-color: rgba(0,0,0,0.3);
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }
                    .wallet-option:hover {
                        background-color: rgba(0,128,255,0.2);
                        transform: translateY(-2px);
                    }
                    .wallet-option img {
                        width: 40px;
                        height: 40px;
                        margin-bottom: 5px;
                    }
                    .wallet-option span {
                        font-size: 12px;
                        color: #ffffff;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Add event listeners for wallet options
            document.getElementById('metamask-mobile').addEventListener('click', () => connectMobileWallet('metamask'));
            document.getElementById('phantom-mobile').addEventListener('click', () => connectMobileWallet('phantom'));
            document.getElementById('coinbase-mobile').addEventListener('click', () => connectMobileWallet('coinbase'));
            document.getElementById('trust-mobile').addEventListener('click', () => connectMobileWallet('trust'));
            
            // Add demo wallet option for Wallet Explorer and other browsers
            const demoWalletButton = document.getElementById('demo-wallet-button');
            if (demoWalletButton) {
                demoWalletButton.addEventListener('click', () => {
                    useDemoWallet();
                });
            }
        }
    }
    
    /**
     * Use a demo wallet for environments where normal wallet connection doesn't work
     * This is particularly useful for Wallet Explorer app or browsers that block deep links
     */
    function useDemoWallet() {
        if (walletStatus) {
            walletStatus.innerHTML = `
                <p style="color: #ffcc00;">Connecting demo wallet...</p>
                <div class="spinner"></div>
            `;
        }
        
        // Simulate a delay for connection
        setTimeout(() => {
            // Generate a demo wallet address
            const randomAddr = '0x' + Array.from({length: 40}, () => 
                Math.floor(Math.random() * 16).toString(16)).join('');
            
            _walletAddress = randomAddr;
            _walletConnected = true;
            _providerName = "Demo Wallet";
            
            showSuccessMessage();
        }, 1500);
    }
    
    /**
     * Connect to a mobile wallet app
     * @param {String} walletType - Type of wallet to connect to
     */
    function connectMobileWallet(walletType) {
        console.log(`Attempting to connect to ${walletType} mobile...`);
        
        // Universal links and specific redirects for wallet apps
        const protocol = window.location.protocol;
        const hostname = window.location.host;
        const pathname = window.location.pathname;
        const fullUrl = encodeURIComponent(window.location.href);
        const currentUrl = protocol + '//' + hostname + pathname;
        const encodedUrl = encodeURIComponent(currentUrl);
        
        let deepLink = '';
        let fallbackURL = '';
        
        switch (walletType) {
            case 'metamask':
                // MetaMask mobile deep link - multiple formats for better compatibility
                deepLink = `metamask://dapp/${hostname}${pathname}`;
                fallbackURL = `https://metamask.app.link/dapp/${hostname}${pathname}`;
                _providerName = 'MetaMask';
                break;
            case 'phantom':
                // Phantom mobile deep link - multiple formats for compatibility
                deepLink = `phantom://browse/${hostname}${pathname}`;
                fallbackURL = `https://phantom.app/ul/browse/${hostname}${pathname}`;
                _providerName = 'Phantom';
                break;
            case 'coinbase':
                // Coinbase Wallet deep link
                deepLink = `coinbasewallet://dapp/${hostname}${pathname}`;
                fallbackURL = `https://go.cb-w.com/dapp?cb_url=${fullUrl}`;
                _providerName = 'Coinbase Wallet';
                break;
            case 'trust':
                // Trust Wallet deep link
                deepLink = `trust://browse?url=${encodedUrl}`;
                fallbackURL = `https://link.trustwallet.com/open_url?url=${encodedUrl}`;
                _providerName = 'Trust Wallet';
                break;
            case 'walletconnect':
                // Wallet Connect 
                fallbackURL = `https://metamask.app.link/dapp/${hostname}${pathname}`;
                _providerName = 'WalletConnect';
                break;
            default:
                if (walletStatus) {
                    walletStatus.innerHTML = `
                        <p style="color: #ff0000;">Unknown wallet type: ${walletType}</p>
                        <button id="retry-connect" style="margin-top: 10px;">Try Again</button>
                    `;
                    
                    // Add retry button event listener
                    const retryButton = document.getElementById('retry-connect');
                    if (retryButton) {
                        retryButton.addEventListener('click', connect);
                    }
                }
                return;
        }
        
        // For demo purposes, since we can't really connect to the wallet in this demo
        // We'll simulate a successful connection after a delay
        if (walletStatus) {
            walletStatus.innerHTML = `
                <p style="color: #ffcc00;">Launching ${_providerName}...</p>
                <div class="spinner"></div>
                <div class="deeplink-notification">
                    <p>If ${_providerName} doesn't open automatically:</p>
                    <a href="${deepLink}" class="manual-link">Open ${_providerName}</a>
                    <p style="margin-top: 10px; font-size: 11px;">
                        Not working? <a href="${fallbackURL}" style="color: #00ffff;">Try this link</a>
                    </p>
                </div>
            `;
        }
        
        // First try the main deep link
        try {
            window.location.href = deepLink;
        } catch (e) {
            console.error("Error with primary deep link:", e);
            // If that fails, try the fallback URL
            try {
                setTimeout(() => {
                    window.location.href = fallbackURL;
                }, 500);
            } catch (e2) {
                console.error("Error with fallback URL:", e2);
            }
        }
        
        // For demo purposes, also simulate success after a timeout
        // In a real implementation, this would be handled by the wallet app's callback
        setTimeout(() => {
            // Create a simulated wallet address based on the wallet type for demo
            let randomAddr;
            
            if (walletType === 'phantom') {
                // Solana-style address
                randomAddr = Array.from({length: 32}, () => 
                    Math.floor(Math.random() * 16).toString(16)).join('');
            } else {
                // Ethereum-style address
                randomAddr = '0x' + Array.from({length: 40}, () => 
                    Math.floor(Math.random() * 16).toString(16)).join('');
            }
            
            _walletAddress = randomAddr;
            _walletConnected = true;
            
            showSuccessMessage();
        }, 5000);
    }
    
    /**
     * Connect to Ethereum wallet (MetaMask, Brave, Coinbase, etc.)
     */
    async function connectEthereumWallet() {
        try {
            let accounts = [];
            
            // Firefox and some other browsers may have ethereum but need a different approach
            if (!window.ethereum.request && window.ethereum.enable) {
                // Legacy method (for Firefox with some wallets)
                accounts = await window.ethereum.enable();
                console.log("Used legacy ethereum.enable() method");
            } else {
                // Standard method
                accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                console.log("Used standard ethereum.request() method");
            }
            
            if (accounts && accounts.length > 0) {
                _walletAddress = accounts[0];
                _walletConnected = true;
                
                // Try to determine which wallet we connected to
                if (window.ethereum.isMetaMask) {
                    _providerName = "MetaMask";
                } else if (window.ethereum.isBraveWallet) {
                    _providerName = "Brave Wallet";
                } else if (window.ethereum.isCoinbaseWallet) {
                    _providerName = "Coinbase Wallet";
                } else if (navigator.userAgent.indexOf("Firefox") != -1) {
                    _providerName = "Firefox Wallet";
                } else {
                    _providerName = "Ethereum Wallet";
                }
                
                // Set up event listeners (with error handling for Firefox)
                try {
                    window.ethereum.on('accountsChanged', handleAccountsChanged);
                    window.ethereum.on('disconnect', handleDisconnect);
                } catch (eventError) {
                    console.warn("Could not set up ethereum event listeners:", eventError.message);
                }
                
                showSuccessMessage();
                return true;
            } else {
                throw new Error("No accounts returned from wallet");
            }
        } catch (error) {
            console.error("Ethereum wallet connection error:", error);
            
            // User rejected the connection
            if (error.code === 4001) {
                if (walletStatus) {
                    walletStatus.innerHTML = `
                        <p style="color: #ff0000;">Connection rejected. Please try again.</p>
                        <button id="retry-connect" style="margin-top: 10px;">Try Again</button>
                    `;
                    
                    // Add retry button event listener
                    const retryButton = document.getElementById('retry-connect');
                    if (retryButton) {
                        retryButton.addEventListener('click', connect);
                    }
                }
            } else {
                throw error; // Re-throw for the main catch block
            }
        }
    }
    
    /**
     * Connect to Solana wallet (Phantom, etc.)
     */
    async function connectSolanaWallet() {
        try {
            // Connect to Solana wallet
            const response = await window.solana.connect();
            
            if (response && response.publicKey) {
                _walletAddress = response.publicKey.toString();
                _walletConnected = true;
                
                // Determine provider name
                if (window.solana.isPhantom) {
                    _providerName = "Phantom";
                } else {
                    _providerName = "Solana Wallet";
                }
                
                // Set up event listeners
                window.solana.on('disconnect', handleDisconnect);
                
                showSuccessMessage();
                return true;
            } else {
                throw new Error("Invalid response from Solana wallet");
            }
        } catch (error) {
            console.error("Solana wallet connection error:", error);
            throw error; // Re-throw for the main catch block
        }
    }
    
    /**
     * Show success message after connecting
     */
    function showSuccessMessage() {
        // Show success message with provider name
        if (walletStatus) {
            walletStatus.innerHTML = `
                <p style="color: #00ff00;">${_providerName} connected!</p>
                <div id="wallet-address">${formatWalletAddress(_walletAddress)}</div>
            `;
        }
        
        // Show username input
        if (usernameContainer) {
            usernameContainer.style.display = 'block';
        }
        
        if (connectWalletBtn) {
            connectWalletBtn.style.display = 'none';
        }
        
        // Execute callback if defined
        if (_onConnectedCallback) {
            _onConnectedCallback(_walletAddress, _providerName);
        }
    }
    
    /**
     * Format wallet address for display (shortens it)
     * @param {String} address - Full wallet address
     * @returns {String} - Formatted address
     */
    function formatWalletAddress(address) {
        if (!address) return '';
        return address.substring(0, 6) + '...' + address.substring(address.length - 4);
    }
    
    /**
     * Handle when user changes accounts
     * @param {Array} accounts - Array of accounts
     */
    function handleAccountsChanged(accounts) {
        console.log("Accounts changed:", accounts);
        
        if (accounts.length === 0) {
            // User disconnected their wallet
            handleDisconnect();
        } else if (accounts[0] !== _walletAddress) {
            // User switched to a different account
            _walletAddress = accounts[0];
            
            if (walletStatus) {
                walletStatus.innerHTML = `
                    <p style="color: #00ff00;">Switched to new wallet!</p>
                    <div id="wallet-address">${formatWalletAddress(_walletAddress)}</div>
                `;
            }
        }
    }
    
    /**
     * Handle wallet disconnection
     */
    function handleDisconnect() {
        console.log("Wallet disconnected");
        
        _walletConnected = false;
        _walletAddress = null;
        
        if (walletStatus) {
            walletStatus.innerHTML = `
                <p style="color: #ff0000;">Wallet disconnected. Please reconnect.</p>
            `;
        }
        
        if (usernameContainer) {
            usernameContainer.style.display = 'none';
        }
        
        if (connectWalletBtn) {
            connectWalletBtn.style.display = 'block';
        }
    }
    
    /**
     * Check if wallet is connected
     * @returns {Boolean} - True if wallet is connected
     */
    function isConnected() {
        return _walletConnected;
    }
    
    /**
     * Get wallet address
     * @returns {String} - Wallet address
     */
    function getAddress() {
        return _walletAddress;
    }
    
    /**
     * Get provider name
     * @returns {String} - Provider name
     */
    function getProviderName() {
        return _providerName;
    }
    
    /**
     * Check if the device is mobile
     * @returns {Boolean} - True if device is mobile
     */
    function isMobileDevice() {
        return _isMobile;
    }
    
    // Public API
    return {
        init,
        connect,
        isConnected,
        getAddress,
        getProviderName,
        isMobileDevice
    };
})();Falt%3Dmedia%26token%3Da3a5a933-7009-4e5e-9ca6-79285d1bd5f7" 
                                 alt="Phantom" style="width: 30px; height: 30px;">
                        </a>
                        <a href="https://www.coinbase.com/wallet/downloads" target="_blank" style="margin: 0 5px;">
                            <img src="https://altcoinsbox.com/wp-content/uploads/2023/03/coinbase-wallet-logo.png" 
                                 alt="Coinbase Wallet" style="width: 30px; height: 30px;">
                        </a>
                    </div>
                `;
            }
        } catch (error) {
            console.error("Wallet connection error:", error);
            
            if (walletStatus) {
                walletStatus.innerHTML = `
                    <p style="color: #ff0000;">Connection error: ${error.message || "Unknown error"}</p>
                    <button id="retry-connect" style="margin-top: 10px;">Try Again</button>
                `;
                
                // Add retry button event listener
                const retryButton = document.getElementById('retry-connect');
                if (retryButton) {
                    retryButton.addEventListener('click', connect);
                }
            }
        }
    }
    
    /**
     * Connect to Ethereum wallet (MetaMask, Brave, Coinbase, etc.)
     */
    async function connectEthereumWallet() {
        try {
            let accounts = [];
            
            // Request accounts access - this will trigger the wallet popup
            accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            if (accounts && accounts.length > 0) {
                _walletAddress = accounts[0];
                _walletConnected = true;
                
                // Try to determine which wallet we connected to
                if (window.ethereum.isMetaMask) {
                    _providerName = "MetaMask";
                } else if (window.ethereum.isBraveWallet) {
                    _providerName = "Brave Wallet";
                } else if (window.ethereum.isCoinbaseWallet) {
                    _providerName = "Coinbase Wallet";
                } else {
                    _providerName = "Ethereum Wallet";
                }
                
                // Set up event listeners
                window.ethereum.on('accountsChanged', handleAccountsChanged);
                window.ethereum.on('disconnect', handleDisconnect);
                
                showSuccessMessage();
                return true;
            } else {
                throw new Error("No accounts returned from wallet");
            }
        } catch (error) {
            console.error("Ethereum wallet connection error:", error);
            
            // User rejected the connection
            if (error.code === 4001) {
                if (walletStatus) {
                    walletStatus.innerHTML = `
                        <p style="color: #ff0000;">Connection rejected. Please try again.</p>
                        <button id="retry-connect" style="margin-top: 10px;">Try Again</button>
                    `;
                    
                    // Add retry button event listener
                    const retryButton = document.getElementById('retry-connect');
                    if (retryButton) {
                        retryButton.addEventListener('click', connect);
                    }
                }
            } else {
                throw error; // Re-throw for the main catch block
            }
        }
    }
    
    /**
     * Connect to Solana wallet (Phantom, etc.)
     */
    async function connectSolanaWallet() {
        try {
            // Connect to Solana wallet
            const response = await window.solana.connect();
            
            if (response && response.publicKey) {
                _walletAddress = response.publicKey.toString();
                _walletConnected = true;
                
                // Determine provider name
                if (window.solana.isPhantom) {
                    _providerName = "Phantom";
                } else {
                    _providerName = "Solana Wallet";
                }
                
                // Set up event listeners
                window.solana.on('disconnect', handleDisconnect);
                
                showSuccessMessage();
                return true;
            } else {
                throw new Error("Invalid response from Solana wallet");
            }
        } catch (error) {
            console.error("Solana wallet connection error:", error);
            throw error; // Re-throw for the main catch block
        }
    }
    
    /**
     * Show success message after connecting
     */
    function showSuccessMessage() {
        // Show success message with provider name
        if (walletStatus) {
            walletStatus.innerHTML = `
                <p style="color: #00ff00;">${_providerName} connected!</p>
                <div id="wallet-address">${formatWalletAddress(_walletAddress)}</div>
            `;
        }
        
        // Show username input
        if (usernameContainer) {
            usernameContainer.style.display = 'block';
        }
        
        if (connectWalletBtn) {
            connectWalletBtn.style.display = 'none';
        }
        
        // Execute callback if defined
        if (_onConnectedCallback) {
            _onConnectedCallback(_walletAddress, _providerName);
        }
    }
    
    /**
     * Format wallet address for display (shortens it)
     * @param {String} address - Full wallet address
     * @returns {String} - Formatted address
     */
    function formatWalletAddress(address) {
        if (!address) return '';
        return address.substring(0, 6) + '...' + address.substring(address.length - 4);
    }
    
    /**
     * Handle when user changes accounts
     * @param {Array} accounts - Array of accounts
     */
    function handleAccountsChanged(accounts) {
        console.log("Accounts changed:", accounts);
        
        if (accounts.length === 0) {
            // User disconnected their wallet
            handleDisconnect();
        } else if (accounts[0] !== _walletAddress) {
            // User switched to a different account
            _walletAddress = accounts[0];
            
            if (walletStatus) {
                walletStatus.innerHTML = `
                    <p style="color: #00ff00;">Switched to new wallet!</p>
                    <div id="wallet-address">${formatWalletAddress(_walletAddress)}</div>
                `;
            }
        }
    }
    
    /**
     * Handle wallet disconnection
     */
    function handleDisconnect() {
        console.log("Wallet disconnected");
        
        _walletConnected = false;
        _walletAddress = null;
        
        if (walletStatus) {
            walletStatus.innerHTML = `
                <p style="color: #ff0000;">Wallet disconnected. Please reconnect.</p>
            `;
        }
        
        if (usernameContainer) {
            usernameContainer.style.display = 'none';
        }
        
        if (connectWalletBtn) {
            connectWalletBtn.style.display = 'block';
        }
    }
    
    /**
     * Check if wallet is connected
     * @returns {Boolean} - True if wallet is connected
     */
    function isConnected() {
        return _walletConnected;
    }
    
    /**
     * Get wallet address
     * @returns {String} - Wallet address
     */
    function getAddress() {
        return _walletAddress;
    }
    
    /**
     * Get provider name
     * @returns {String} - Provider name
     */
    function getProviderName() {
        return _providerName;
    }
    
    // Public API
    return {
        init,
        connect,
        isConnected,
        getAddress,
        getProviderName
    };
})();