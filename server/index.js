import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for testing
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 10000,
  pingInterval: 5000,
  transports: ['websocket', 'polling']
});

// Store active rooms and their participants
const rooms = new Map();

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    connections: io.engine.clientsCount,
    rooms: Array.from(rooms.keys())
  });
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  let currentRoom = null;

  // Send immediate confirmation to client
  socket.emit('connected', { id: socket.id });

  // Add ping-pong for connection testing
  socket.on('ping', (callback) => {
    console.log(`Ping from ${socket.id}`);
    if (typeof callback === 'function') {
      callback({ time: Date.now(), id: socket.id });
    } else {
      socket.emit('pong', { time: Date.now(), id: socket.id });
    }
  });

  // Handle explicit room leaving
  socket.on('leaveRoom', (roomId) => {
    if (roomId && rooms.has(roomId)) {
      console.log(`User ${socket.id} explicitly leaving room ${roomId}`);
      socket.leave(roomId);
      rooms.get(roomId).delete(socket.id);
      io.in(roomId).emit('userList', Array.from(rooms.get(roomId).values()));
    }
  });

  // Join a collaboration room
  socket.on('joinRoom', ({ roomId, username }) => {
    try {
      console.log(`User ${username} (${socket.id}) attempting to join room ${roomId}`);
      
      // Leave previous room if any
      if (currentRoom) {
        console.log(`User ${username} leaving previous room ${currentRoom}`);
        socket.leave(currentRoom);
        if (rooms.has(currentRoom)) {
          rooms.get(currentRoom).delete(socket.id);
          io.in(currentRoom).emit('userList', Array.from(rooms.get(currentRoom).values()));
        }
      }

      // Initialize room if doesn't exist
      if (!rooms.has(roomId)) {
        console.log(`Creating new room: ${roomId}`);
        rooms.set(roomId, new Map());
      }

      // Check if username already exists in the room
      const existingUsers = Array.from(rooms.get(roomId).values());
      const isDuplicateUsername = existingUsers.some(user => user.username === username);
      
      if (isDuplicateUsername) {
        console.log(`Username ${username} is already taken in room ${roomId}`);
        socket.emit('error', { message: 'Username is already taken in this room' });
        return;
      }

      // Join new room
      socket.join(roomId);
      currentRoom = roomId;

      // Add user to room
      rooms.get(roomId).set(socket.id, { username, cursor: null });

      // Log room state
      const roomUsers = Array.from(rooms.get(roomId).values());
      console.log(`Room ${roomId} users:`, roomUsers.map(u => u.username).join(', '));

      // Confirm room join to the client
      socket.emit('roomJoined', { roomId, users: roomUsers });

      // Broadcast updated user list to ALL clients in the room
      io.in(roomId).emit('userList', roomUsers);

      // Request current code state from an existing user if available
      if (roomUsers.length > 1) {
        console.log(`Requesting code from existing users in room ${roomId}`);
        socket.to(roomId).emit('requestCode');
      }
    } catch (error) {
      console.error(`Error joining room ${roomId}:`, error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle code changes
  socket.on('codeChange', ({ roomId, code }) => {
    if (!roomId || !code) {
      console.log(`Invalid code change request: Missing roomId or code`);
      return;
    }
    
    if (!rooms.has(roomId)) {
      console.log(`Invalid code change request: Room ${roomId} doesn't exist`);
      return;
    }
    
    if (!rooms.get(roomId).has(socket.id)) {
      console.log(`Invalid code change request: User ${socket.id} not in room ${roomId}`);
      return;
    }
    
    console.log(`Broadcasting code change in room ${roomId} from user ${socket.id}`);
    
    // Broadcast to all other users in the room
    socket.to(roomId).emit('codeChange', code);
  });

  // Share current code with new users
  socket.on('shareCurrentCode', ({ roomId, code }) => {
    if (!roomId || code === undefined) {
      console.log(`Invalid code share request: Missing roomId or code`);
      return;
    }
    
    if (!rooms.has(roomId)) {
      console.log(`Invalid code share request: Room ${roomId} doesn't exist`);
      return;
    }
    
    if (!rooms.get(roomId).has(socket.id)) {
      console.log(`Invalid code share request: User ${socket.id} not in room ${roomId}`);
      return;
    }
    
    console.log(`Sharing code in room ${roomId} from user ${socket.id}`);
    
    // Send to all OTHER clients in the room (not back to sender)
    socket.to(roomId).emit('codeChange', code);
  });

  // Handle cursor position updates
  socket.on('cursorMove', ({ roomId, position }) => {
    if (!rooms.has(roomId) || !rooms.get(roomId).has(socket.id)) {
      return;
    }
    const userInfo = rooms.get(roomId).get(socket.id);
    userInfo.cursor = position;
    socket.to(roomId).emit('cursorUpdate', {
      userId: socket.id,
      username: userInfo.username,
      position
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (currentRoom && rooms.has(currentRoom)) {
      // Remove user from room
      rooms.get(currentRoom).delete(socket.id);
      
      // If room is empty, delete it
      if (rooms.get(currentRoom).size === 0) {
        console.log(`Deleting empty room: ${currentRoom}`);
        rooms.delete(currentRoom);
      } else {
        // Broadcast updated user list
        const roomUsers = Array.from(rooms.get(currentRoom).values());
        console.log(`Updated room ${currentRoom} users:`, roomUsers.map(u => u.username));
        io.in(currentRoom).emit('userList', roomUsers);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
