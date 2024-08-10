const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// Setup CORS based on the environment
const clientUrl = process.env.NODE_ENV === 'production' 
                  ? 'https://tic-tac-mine.onrender.com'   // Production client URL
                  : 'http://localhost:3000';             // Development client URL

const io = socketIo(server, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Serve a simple test route to verify server operation
app.get('/', (req, res) => {
  res.send("Server is running!");
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('move', (data) => {
    console.log('Move received:', data);
    io.emit('move', { grid: data.grid, nextPlayer: data.nextPlayer });
  });

  socket.on('revealMines', () => {
    console.log('Mines revealed to all clients');
    io.emit('minesRevealed');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('error', (err) => {
    console.error('Socket encountered error:', err);
    socket.disconnect(true);
  });
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
