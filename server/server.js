const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  socket.on('move', (data) => {
    console.log(`Move received:`, data);
    io.emit('move', { grid: data.grid, nextPlayer: data.nextPlayer });
  });

  socket.on('revealMines', () => {
    console.log('Mines revealed to all clients');
    io.emit('minesRevealed');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });

  socket.on('error', (err) => {
    console.error('Socket encountered error:', err);
    socket.disconnect(true);
  });
});

server.listen(3001, () => {
  console.log('Listening on port 3001');
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
