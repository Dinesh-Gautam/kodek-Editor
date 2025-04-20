import { createServer } from 'http';

import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for testing
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 10000,
  pingInterval: 5000,
  transports: ['websocket', 'polling'],
});

// Store active rooms and their participants
// rooms: Map<roomId, Map<socketId, { id: string, username: string, color: string, cursor: position | null }>>
const rooms = new Map();

// --- Color Assignment Logic (similar to client) ---
const colors = [
  '#FF5252',
  '#7C4DFF',
  '#00BFA5',
  '#FFD740',
  '#64DD17',
  '#448AFF',
  '#FF6E40',
  '#EC407A',
  '#26A69A',
  '#AB47BC',
  '#5C6BC0',
  '#FFA726',
];

const assignUserColor = (username) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
// --- End Color Assignment ---

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    connections: io.engine.clientsCount,
    rooms: Array.from(rooms.keys()),
  });
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  let currentRoom = null;
  let currentUser = null; // Store { id, username, color }

  // Send immediate confirmation to client
  socket.emit('connected', { id: socket.id });

  // Add ping-pong for connection testing
  socket.on('ping', (callback) => {
    // console.log(`Ping from ${socket.id}`); // Reduce noise
    if (typeof callback === 'function') {
      callback({ time: Date.now(), id: socket.id });
    } else {
      socket.emit('pong', { time: Date.now(), id: socket.id });
    }
  });

  // Handle explicit room leaving (optional, disconnect handles most cases)
  socket.on('leaveRoom', (roomId) => {
    if (roomId && rooms.has(roomId) && rooms.get(roomId).has(socket.id)) {
      console.log(`User ${socket.id} explicitly leaving room ${roomId}`);
      socket.leave(roomId);
      const leavingUser = rooms.get(roomId).get(socket.id);
      rooms.get(roomId).delete(socket.id);

      // Notify others the user left
      socket.to(roomId).emit('userLeft', {
        userId: socket.id,
        username: leavingUser?.username,
      });

      // Send updated user list
      const roomUsers = Array.from(rooms.get(roomId).values());
      io.in(roomId).emit('userList', roomUsers);

      if (rooms.get(roomId).size === 0) {
        console.log(`Deleting empty room: ${roomId}`);
        rooms.delete(roomId);
      }
      if (currentRoom === roomId) {
        currentRoom = null;
        currentUser = null;
      }
    }
  });

  // Join a collaboration room
  socket.on('joinRoom', ({ roomId, username }) => {
    try {
      console.log(
        `User ${username} (${socket.id}) attempting to join room ${roomId}`,
      );

      // Basic validation
      if (!roomId || !username) {
        socket.emit('error', { message: 'Room ID and Username are required.' });
        return;
      }

      // Leave previous room if any
      if (currentRoom && currentRoom !== roomId) {
        console.log(`User ${username} leaving previous room ${currentRoom}`);
        socket.leave(currentRoom);
        if (rooms.has(currentRoom)) {
          const leavingUser = rooms.get(currentRoom).get(socket.id);
          rooms.get(currentRoom).delete(socket.id);
          // Notify others the user left the old room
          socket.to(currentRoom).emit('userLeft', {
            userId: socket.id,
            username: leavingUser?.username,
          });
          // Send updated user list for the old room
          const oldRoomUsers = Array.from(rooms.get(currentRoom).values());
          io.in(currentRoom).emit('userList', oldRoomUsers);
          if (rooms.get(currentRoom).size === 0) {
            console.log(`Deleting empty room: ${currentRoom}`);
            rooms.delete(currentRoom);
          }
        }
      }

      // Initialize room if doesn't exist
      if (!rooms.has(roomId)) {
        console.log(`Creating new room: ${roomId}`);
        rooms.set(roomId, new Map());
      }

      // Check if username already exists in the room
      const existingUsers = Array.from(rooms.get(roomId).values());
      const isDuplicateUsername = existingUsers.some(
        (user) => user.username === username,
      );

      if (isDuplicateUsername) {
        console.log(`Username ${username} is already taken in room ${roomId}`);
        socket.emit('error', {
          message: 'Username is already taken in this room',
        });
        return;
      }

      // Join new room
      socket.join(roomId);
      currentRoom = roomId;
      const userColor = assignUserColor(username);
      currentUser = { id: socket.id, username, color: userColor }; // Store user info

      // Add user to room
      const isHost = rooms.get(roomId).size === 0; // Check if this is the first user
      rooms
        .get(roomId)
        .set(socket.id, { ...currentUser, cursor: null, host: isHost }); // Store full user info and host status

      // Log room state
      const roomUsers = Array.from(rooms.get(roomId).values());
      console.log(
        `Room ${roomId} users:`,
        roomUsers.map((u) => `${u.username}(${u.color})`).join(', '),
      );

      // Confirm room join to the client
      socket.emit('roomJoined', {
        roomId,
        users: roomUsers,
        self: currentUser,
      }); // Send self info too

      // // Broadcast updated user list to ALL clients in the room
      io.in(roomId).emit('userList', roomUsers);

      if (currentUser.host) return;

      const hostUser = roomUsers.find((user) => user.host);
      console.log('host', hostUser);
      // Request current code state from an existing host if available
      if (hostUser) {
        console.log(`Requesting code from existing host in room ${roomId}`);

        io.to(hostUser.id).emit('requestCode', {
          requesterId: socket.id,
        });
      }
    } catch (error) {
      console.error(`Error joining room ${roomId}:`, error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle code changes
  socket.on('codeChange', ({ roomId, userId, data }) => {
    if (
      !roomId ||
      data === undefined ||
      !currentRoom ||
      roomId !== currentRoom
    ) {
      console.log(
        `Invalid code change request: Missing/invalid roomId or code, or not in room.`,
      );
      return;
    }
    if (!rooms.has(roomId) || !rooms.get(roomId).has(socket.id)) {
      console.log(
        `Invalid code change request: Room ${roomId} doesn't exist or user ${socket.id} not in it.`,
      );
      return;
    }

    // console.log(`Broadcasting code change in room ${roomId} from user ${socket.id}`); // Reduce noise
    // Broadcast to all other users in the room
    socket.to(roomId).emit('codeChange', {
      userId,
      data,
    });
  });

  // Share current code with new users (or specific requester)
  socket.on('shareCode', ({ roomId, code, requesterId }) => {
    if (
      !roomId ||
      code === undefined ||
      !currentRoom ||
      roomId !== currentRoom
    ) {
      console.log(
        `Invalid code share request: Missing/invalid roomId or code, or not in room.`,
      );
      return;
    }
    if (!rooms.has(roomId) || !rooms.get(roomId).has(socket.id)) {
      console.log(
        `Invalid code share request: Room ${roomId} doesn't exist or user ${socket.id} not in it.`,
      );
      return;
    }

    console.log(
      `Sharing code in room ${roomId} from user ${socket.id} to ${requesterId || 'new users'}`,
    );

    // Send to the specific requester if provided, otherwise broadcast to others
    if (requesterId) {
      io.to(requesterId).emit('codeChange', { data: { code }, initial: true });
    } else {
      // This case might be less common now with targeted requests
      socket.to(roomId).emit('codeChange', { code });
    }
  });

  // Handle cursor position updates
  socket.on('cursorMove', ({ roomId, position, visible }) => {
    if (!roomId || !position || !currentRoom || roomId !== currentRoom) {
      // console.warn(`Invalid cursor move: Missing data or wrong room. Room: ${roomId}, Current: ${currentRoom}`);
      return;
    }
    if (!rooms.has(roomId) || !rooms.get(roomId).has(socket.id)) {
      // console.warn(`Invalid cursor move: Room ${roomId} doesn't exist or user ${socket.id} not in it.`);
      return;
    }

    const roomData = rooms.get(roomId);
    const userInfo = roomData.get(socket.id);

    if (!userInfo) {
      console.warn(`User info not found for ${socket.id} in room ${roomId}`);
      return;
    }

    // Update cursor position in server state
    userInfo.cursor = position;
    roomData.set(socket.id, userInfo); // Update the map entry

    // Broadcast to all other users in the room
    socket.to(roomId).emit('cursorUpdate', {
      userId: socket.id,
      username: userInfo.username,
      position: position,
      visible,
      color: userInfo.color, // Include color
    });
  });

  socket.on('mouse-move', ({ roomId, coordinates, visible }) => {
    if (!roomId || roomId !== currentRoom) {
      // console.warn(`Invalid cursor move: Missing data or wrong room. Room: ${roomId}, Current: ${currentRoom}`);
      return;
    }
    if (!rooms.has(roomId) || !rooms.get(roomId).has(socket.id)) {
      // console.warn(`Invalid cursor move: Room ${roomId} doesn't exist or user ${socket.id} not in it.`);
      return;
    }

    const roomData = rooms.get(roomId);
    const userInfo = roomData.get(socket.id);

    if (!userInfo) {
      console.warn(`User info not found for ${socket.id} in room ${roomId}`);
      return;
    }

    // Update cursor position in server state
    if (coordinates) userInfo.coordinates = coordinates;
    roomData.set(socket.id, userInfo); // Update the map entry

    // Broadcast to all other users in the room
    socket.to(roomId).emit('mouse-update', {
      userId: socket.id,
      username: userInfo.username,
      coordinates: userInfo.coordinates,
      visible,
      color: userInfo.color, // Include color
    });
  });

  // Handle language changes
  socket.on('languageChange', ({ roomId, userId, language }) => {
    if (
      !roomId ||
      !language ||
      !userId ||
      !currentRoom ||
      roomId !== currentRoom
    ) {
      console.log('Invalid language change request:', {
        roomId,
        language,
        userId,
        currentRoom,
      });
      return;
    }
    if (!rooms.has(roomId) || !rooms.get(roomId).has(socket.id)) {
      console.log(
        `Invalid language change: Room ${roomId} or user ${socket.id} not found.`,
      );
      return;
    }
    console.log(
      `Broadcasting language change in room ${roomId} from user ${userId}: ${language}`,
    );
    // Broadcast to all other users in the room
    socket.to(roomId).emit('languageChange', { userId, language });
  });

  // Handle code output sharing
  socket.on('codeOutput', ({ roomId, userId, output }) => {
    if (
      !roomId ||
      output === undefined ||
      !userId ||
      !currentRoom ||
      roomId !== currentRoom
    ) {
      console.log('Invalid code output request:', {
        roomId,
        output,
        userId,
        currentRoom,
      });
      return;
    }
    const roomData = rooms.get(roomId);
    const userInfo = roomData?.get(userId); // Get user info from the map

    if (!userInfo || !userInfo.username) {
      console.log(
        `Could not find user info or username for userId ${userId} in room ${roomId}`,
      );
      return; // Don't broadcast if user info or username is missing
    }
    console.log(userInfo);
    console.log(
      `Broadcasting code output in room ${roomId} from user ${userInfo.username} (${userId})`,
    );
    // Broadcast to all other users in the room
    socket
      .to(roomId)
      .emit('codeOutput', { userId, username: userInfo.username, output }); // Include username from map
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
    if (currentRoom && rooms.has(currentRoom)) {
      const roomData = rooms.get(currentRoom);
      const leavingUser = roomData.get(socket.id); // Get user info before deleting

      if (leavingUser) {
        // Remove user from room
        roomData.delete(socket.id);
        console.log(
          `User ${leavingUser.username} (${socket.id}) removed from room ${currentRoom}`,
        );

        // Notify remaining users
        socket.to(currentRoom).emit('userLeft', {
          userId: socket.id,
          username: leavingUser.username,
        });

        // If room is empty, delete it
        if (roomData.size === 0) {
          console.log(`Deleting empty room: ${currentRoom}`);
          rooms.delete(currentRoom);
        } else {
          // Broadcast updated user list
          const roomUsers = Array.from(roomData.values());
          console.log(
            `Updated room ${currentRoom} users:`,
            roomUsers.map((u) => u.username),
          );
          io.in(currentRoom).emit('userList', roomUsers);
        }
      } else {
        console.log(
          `User ${socket.id} was in room ${currentRoom} but info not found upon disconnect.`,
        );
      }
    } else {
      console.log(
        `User ${socket.id} disconnected without being in a tracked room.`,
      );
    }
    currentRoom = null; // Clear room association
    currentUser = null;
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
