import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { setupHueRoutes } from './routes/hue';
import { setupWebSocket } from './websocket';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
setupHueRoutes(app);

// Create HTTP server
const server = createServer(app);

// Setup WebSocket
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

// Start server
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 