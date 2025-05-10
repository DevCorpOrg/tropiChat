/**
 * Web3 P2P Chat Architecture Diagram
 * 
 * This code generates a diagram of the P2P WebRTC architecture
 * for the TropiChat Web3 application. It shows how peers connect
 * to each other directly after initial signaling.
 */

// Create a diagram using an ASCII chart
const p2pArchitectureDiagram = `
+------------------------------------------------------------------------------+
|                        WEB3 P2P CHAT ARCHITECTURE                            |
+------------------------------------------------------------------------------+

   ┌─────────────────────────────────────────────────────────────────┐
   │                      SIGNALING SERVER                            │
   │                                                                  │
   │    ┌──────────────┐     ┌─────────────┐     ┌───────────────┐   │
   │    │ User Registry│     │Connection   │     │Wallet         │   │
   │    │              │     │Facilitation │     │Verification   │   │
   │    └──────────────┘     └─────────────┘     └───────────────┘   │
   │                                                                  │
   └───────┬───────────────────────┬──────────────────────┬──────────┘
           │                       │                      │
           │                       │                      │
           │     Initial Connection & Signaling           │
           │                       │                      │
           ▼                       ▼                      ▼
   ┌───────────────┐       ┌───────────────┐      ┌───────────────┐
   │  Browser A    │       │  Browser B    │      │  Browser C    │
   │  ┌─────────┐  │       │  ┌─────────┐  │      │  ┌─────────┐  │
   │  │TropiChat│  │       │  │TropiChat│  │      │  │TropiChat│  │
   │  │Web App  │  │       │  │Web App  │  │      │  │Web App  │  │
   │  └─────────┘  │       │  └─────────┘  │      │  └─────────┘  │
   │  ┌─────────┐  │       │  ┌─────────┐  │      │  ┌─────────┐  │
   │  │WebRTC   │  │       │  │WebRTC   │  │      │  │WebRTC   │  │
   │  │Connection│  │       │  │Connection│  │      │  │Connection│  │
   │  └─────────┘  │       │  └─────────┘  │      │  └─────────┘  │
   │  ┌─────────┐  │       │  ┌─────────┐  │      │  ┌─────────┐  │
   │  │Wallet   │  │       │  │Wallet   │  │      │  │Wallet   │  │
   │  │Provider │  │       │  │Provider │  │      │  │Provider │  │
   │  └─────────┘  │       │  └─────────┘  │      │  └─────────┘  │
   └───────────────┘       └───────────────┘      └───────────────┘
          ▲ ▲                    ▲ ▲                   ▲ ▲
          │ │                    │ │                   │ │
          │ └────────────────────┘ └───────────────────┘ │
          │                                               │
          └───────────────────────────────────────────────┘
                          Direct P2P Communication
                         (Messages, User Updates)

+------------------------------------------------------------------------------+
|                            DATA FLOW DIAGRAM                                 |
+------------------------------------------------------------------------------+

   INITIAL CONNECTION                    PEER-TO-PEER MESSAGING
   ──────────────────                    ─────────────────────

   ┌──────────┐                          ┌──────────┐     ┌──────────┐
   │Browser A │                          │Browser A │     │Browser B │
   └────┬─────┘                          └────┬─────┘     └────┬─────┘
        │                                     │                │
        │  1. Connect to                      │  5. Send Message (Encrypted)
        │     Signaling Server                │  ─────────────────────────►
        │                                     │                │
        ▼                                     │                │
   ┌──────────┐                               │                │
   │Signaling │                               │                │
   │Server    │                               │                │
   └────┬─────┘                               │                │
        │                                     │                │
        │  2. Register User & Wallet          │                │
        │     Authentication                  │                │
        │                                     │                │
        │  3. Get Peers List                  │                │
        │     ◄───────────────────────        │                │
        │                                     │                │
        │  4. Exchange WebRTC Signals         │                │
        │     between peers                   │                │
        ▼                                     │                │
   ┌──────────┐                               │                │
   │Browser B │                               │                │
   └──────────┘                               │                │
                                              │  6. Receive Message & Verify
                                              │                │
                                              │                │
                                              │  7. Display in Chat UI
                                              │     ◄─────────────────────
                                              │                │
                                              ▼                ▼

BENEFITS:
- No central server storing messages
- Direct encryption between peers
- Wallet-based authentication
- Reduced server costs
- Better privacy & control
`;

// Display the diagram
console.log(p2pArchitectureDiagram);