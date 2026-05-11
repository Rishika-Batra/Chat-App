# Real-Time Chat Application

A premium 1:1 real-time chat application built with React, Express, PostgreSQL, Redis, and Socket.io.

## Features
- Real-time messaging with Socket.io
- Presence indicators (Online/Offline)
- Typing indicators
- Read receipts
- User search and discovery
- Responsive, clean UI with Tailwind CSS

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, Axios, Socket.io-client
- **Backend**: Node.js, Express, Socket.io, JWT
- **Database**: PostgreSQL (Persistence), Redis (Online presence tracking)

## Setup Instructions

### 1. Prerequisites
- Node.js installed
- PostgreSQL installed and running
- Redis installed and running (optional, defaults to local if not specified)

### 2. Database Setup
1. Create a database named `chatbot`.
2. Run the schema script located at `server/db/schema.sql` to create the necessary tables.

### 3. Environment Variables
Create a `.env` file in the `server` directory:
```env
PORT=3000
DATABASE_URL=postgres://your_username:your_password@localhost:5432/chatbot
JWT_SECRET=your_super_secret_key
REDIS_URL=redis://localhost:6379
```

### 4. Installation
Install dependencies for both the server and client:

```bash
# In the root directory
cd server && npm install
cd ../client && npm install
```

### 5. Running the Application
Start both the server and the client in separate terminal windows:

**Server:**
```bash
cd server
npm run dev
```

**Client:**
```bash
cd client
npm run dev
```

The application will be available at `http://localhost:5173`.

## UI/UX Details
- **Sidebar**: Manage conversations and search for users.
- **Messaging**: Experience seamless real-time chat with "typing..." indicators and read status updates.
- **Auth**: Secure JWT-based authentication ensures your private conversations stay private.
