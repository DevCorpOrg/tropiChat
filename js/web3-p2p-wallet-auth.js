/**
 * Web3 P2P Wallet Authentication
 * 
 * This file demonstrates how to authenticate users in a P2P chat application
 * using their Web3 wallets (Ethereum, Solana, etc.). The authentication
 * process uses wallet signatures to verify user identity.
 */

/**
 * Generate a challenge message for the user to sign
 * @param {String} walletAddress - User's wallet address
 * @returns {String} - Challenge message
 */
function generateChallenge(walletAddress) {
    const timestamp = Date.now();
    const randomValue = Math.floor(Math.random() * 1000000);
    
    return `TropiChat P2P Authentication
Wallet: ${walletAddress}
Timestamp: ${timestamp}
Nonce: ${randomValue}
Action: Chat Login`;
}

/**
 * Request signature from Ethereum wallet
 * @param {String} message - Message to sign
 * @returns {Promise<String>} - Signature
 */
async function signWithEthereumWallet(message) {
    try {
        if (!window.ethereum) {
            throw new Error('Ethereum provider not found');
        }
        
        // Get wallet accounts
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) {
            throw new Error('No Ethereum accounts available');
        }
        
        // Request personal signature
        const signature = await window.ethereum.request({
            method: 'personal_sign',
            params: [message, accounts[0]]
        });
        
        return {
            walletAddress: accounts[0],
            signature,
            message,
            type: 'ethereum'
        };
    } catch (error) {
        console.error('Error signing with Ethereum wallet:', error);
        throw error;
    }
}

/**
 * Request signature from Solana wallet (e.g., Phantom)
 * @param {String} message - Message to sign
 * @returns {Promise<Object>} - Signature data
 */
async function signWithSolanaWallet(message) {
    try {
        if (!window.solana || !window.solana.isPhantom) {
            throw new Error('Phantom wallet not found');
        }
        
        // Connect to wallet if not connected
        if (!window.solana.isConnected) {
            await window.solana.connect();
        }
        
        // Get wallet public key
        const publicKey = window.solana.publicKey.toString();
        
        // Request signature
        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
        
        return {
            walletAddress: publicKey,
            signature: signedMessage.signature.toString('hex'),
            message,
            type: 'solana'
        };
    } catch (error) {
        console.error('Error signing with Solana wallet:', error);
        throw error;
    }
}

/**
 * Verify Ethereum signature
 * @param {String} message - Original message
 * @param {String} signature - Signature
 * @param {String} walletAddress - Claimed wallet address
 * @returns {Boolean} - Whether signature is valid
 */
function verifyEthereumSignature(message, signature, walletAddress) {
    try {
        // Import ethers.js if not already available
        if (typeof ethers === 'undefined') {
            console.error('ethers.js library not available');
            return false;
        }
        
        // Recover address from signature
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        
        // Compare with claimed address (case-insensitive)
        return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
        console.error('Error verifying Ethereum signature:', error);
        return false;
    }
}

/**
 * Verify Solana signature (simplified - would normally use tweetnacl)
 * @param {String} message - Original message
 * @param {String} signature - Signature
 * @param {String} walletAddress - Claimed wallet address
 * @returns {Boolean} - Whether signature is valid
 */
function verifySolanaSignature(message, signature, walletAddress) {
    try {
        // In a real implementation, you would use tweetnacl-js or similar:
        // import nacl from 'tweetnacl';
        // const messageBytes = new TextEncoder().encode(message);
        // const signatureBytes = bs58.decode(signature);
        // const publicKeyBytes = bs58.decode(walletAddress);
        // return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
        
        // This is a placeholder - in a signaling server, you would implement proper verification
        console.log('Solana signature verification would happen here');
        return true;
    } catch (error) {
        console.error('Error verifying Solana signature:', error);
        return false;
    }
}

/**
 * Authenticate user with wallet
 * @returns {Promise<Object>} - Authentication data
 */
async function authenticateWithWallet() {
    try {
        // Detect available wallets
        const hasEthereum = typeof window.ethereum !== 'undefined';
        const hasSolana = typeof window.solana !== 'undefined' && window.solana.isPhantom;
        
        let authData;
        
        if (hasEthereum) {
            // Get Ethereum address first
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];
            
            // Generate challenge and sign
            const challenge = generateChallenge(address);
            authData = await signWithEthereumWallet(challenge);
        } else if (hasSolana) {
            // Connect to Solana wallet
            const connection = await window.solana.connect();
            const address = connection.publicKey.toString();
            
            // Generate challenge and sign
            const challenge = generateChallenge(address);
            authData = await signWithSolanaWallet(challenge);
        } else {
            throw new Error('No supported wallet found');
        }
        
        return {
            success: true,
            ...authData
        };
    } catch (error) {
        console.error('Authentication error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Example: Integrating wallet authentication with P2P chat
async function joinP2PChat(username, color) {
    try {
        // Authenticate with wallet
        const authResult = await authenticateWithWallet();
        
        if (!authResult.success) {
            throw new Error(`Wallet authentication failed: ${authResult.error}`);
        }
        
        // Create user data
        const userData = {
            username,
            walletAddress: authResult.walletAddress,
            color,
            signature: authResult.signature,
            message: authResult.message,
            walletType: authResult.type,
            timestamp: Date.now()
        };
        
        // Connect to signaling server and initialize P2P connections
        // p2pClient.init();
        // p2pClient.authenticate(userData);
        
        console.log('Authenticated with wallet for P2P chat:', userData);
        return userData;
    } catch (error) {
        console.error('Error joining P2P chat:', error);
        throw error;
    }
}

// Example usage in chat.js
async function enterChatWithWallet() {
    const username = document.getElementById('username-input').value.trim();
    const color = '#' + Math.floor(Math.random()*16777215).toString(16);
    
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    try {
        // Show loading state
        document.getElementById('wallet-status').innerHTML = `
            <p style="color: #ffcc00;">Authenticating with wallet...</p>
            <div class="spinner"></div>
        `;
        
        // Join P2P chat with wallet authentication
        const userData = await joinP2PChat(username, color);
        
        // Update UI
        document.getElementById('wallet-status').innerHTML = `
            <p style="color: #00ff00;">Authenticated with ${userData.walletType} wallet!</p>
            <div id="wallet-address">${userData.walletAddress.substring(0, 6)}...${userData.walletAddress.substring(userData.walletAddress.length - 4)}</div>
        `;
        
        // Close login modal and enable chat
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('message-input').disabled = false;
        document.getElementById('send-button').disabled = false;
        
        // Add system message
        addSystemMessage(`Welcome to P2P TropiChat, ${username}!`);
        addSystemMessage('You are connected directly to other chat participants.');
        addSystemMessage('Type /help for available commands.');
    } catch (error) {
        document.getElementById('wallet-status').innerHTML = `
            <p style="color: #ff0000;">Authentication error: ${error.message}</p>
            <button id="retry-connect" style="margin-top: 10px;">Try Again</button>
        `;
        
        document.getElementById('retry-connect').addEventListener('click', enterChatWithWallet);
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined') {
    module.exports = {
        generateChallenge,
        authenticateWithWallet,
        verifyEthereumSignature,
        verifySolanaSignature,
        joinP2PChat
    };
}