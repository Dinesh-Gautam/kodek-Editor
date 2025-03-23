const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Vite's default port
    methods: ['GET', 'POST']
  }
});

// Store active rooms and their participants
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  let currentRoom = null;

  // Join a collaboration room
  socket.on('joinRoom', ({ roomId, username }) => {
    // Leave previous room if any
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms.get(currentRoom)?.delete(socket.id);
    }

    // Join new room
    currentRoom = roomId;
    socket.join(roomId);

    // Initialize room if doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }

    // Add user to room
    rooms.get(roomId).set(socket.id, { username, cursor: null });

    // Broadcast updated user list
    io.to(roomId).emit('userList', Array.from(rooms.get(roomId).values()));

    // Send current code to new user
    socket.to(roomId).emit('requestCode');
  });

  // Handle code changes
  socket.on('codeChange', ({ roomId, code }) => {
    socket.to(roomId).emit('codeChange', code);
  });

  // Share current code with new users
  socket.on('shareCurrentCode', ({ roomId, code }) => {
    socket.to(roomId).emit('codeChange', code);
  });

  // Handle cursor position updates
  socket.on('cursorMove', ({ roomId, position }) => {
    if (rooms.has(roomId)) {
      const userInfo = rooms.get(roomId).get(socket.id);
      if (userInfo) {
        userInfo.cursor = position;
        socket.to(roomId).emit('cursorUpdate', {
          userId: socket.id,
          username: userInfo.username,
          position
        });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (currentRoom && rooms.has(currentRoom)) {
      // Remove user from room
      rooms.get(currentRoom).delete(socket.id);
      
      // If room is empty, delete it
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
      } else {
        // Broadcast updated user list
        io.to(currentRoom).emit('userList', Array.from(rooms.get(currentRoom).values()));
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
