import { WebSocketServer, WebSocket } from 'ws';
import { v3 } from 'node-hue-api';

interface HueWebSocket extends WebSocket {
    bridgeIp?: string;
    username?: string;
}

export const setupWebSocket = (wss: WebSocketServer) => {
    wss.on('connection', (ws: HueWebSocket) => {
        console.log('New WebSocket connection');

        ws.on('message', async (message: string) => {
            try {
                const data = JSON.parse(message);

                if (data.type === 'init') {
                    ws.bridgeIp = data.bridgeIp;
                    ws.username = data.username;
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });

    // Function to broadcast updates to all connected clients
    const broadcastUpdate = (bridgeIp: string, username: string, data: any) => {
        wss.clients.forEach((client: HueWebSocket) => {
            if (client.bridgeIp === bridgeIp && client.username === username) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            }
        });
    };

    return { broadcastUpdate };
}; 