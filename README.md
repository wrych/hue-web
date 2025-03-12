# Hue Web Controller

A mobile-first web application to control Philips Hue lights. Built with Vue.js and Node.js.

## Features

- Connect to Hue Bridge
- Control light groups/rooms
- Real-time light state updates
- Mobile-first design
- Containerized deployment

## Tech Stack

### Frontend
- Vue.js 3 with TypeScript
- Pinia for state management
- Vuetify for UI components

### Backend
- Node.js with TypeScript
- Express.js
- WebSocket for real-time updates
- Hue API integration

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Start development servers:
   ```bash
   # Start backend (from backend directory)
   npm run dev

   # Start frontend (from frontend directory)
   npm run dev
   ```

## Docker Deployment

1. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

2. Access the application at `http://localhost:3000`

## Environment Variables

### Backend
- `HUE_BRIDGE_IP`: IP address of the Hue Bridge
- `HUE_USERNAME`: Username for Hue Bridge authentication
- `PORT`: Backend server port (default: 3001)

### Frontend
- `VITE_API_URL`: Backend API URL (default: http://localhost:3001) 