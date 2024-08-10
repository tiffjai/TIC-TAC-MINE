const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://tiffjai.github.io",  // Adjust according to your client URL
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.get('/', (req, res) => {
  res.send("Server is running!");
});

const games = new Map();

function initializeGame() {
  const grid = Array(9).fill().map(() => Array(9).fill({ revealed: false, value: null, isMine: false }));
  const mineLocations = [];
  while (mineLocations.length < 10) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (!mineLocations.some(mine => mine.row === row && mine.col === col)) {
      mineLocations.push({ row, col });
      grid[row][col].isMine = true;
    }
  }
  return { grid, mineLocations, currentPlayer: 'X', players: [], scores: { X: 0, O: 0 } };
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', () => {
    let room = [...games.entries()].find(([_, g]) => g.players.length < 2);
    
    if (!room) {
      // Create a new game room if no available room or all rooms are full
      const roomId = uuidv4();
      const newGame = initializeGame();
      games.set(roomId, newGame);
      room = [roomId, newGame];
    }

    const [roomId, game] = room;
    game.players.push(socket.id);
    socket.join(roomId);

    console.log(`Player ${socket.id} joined room ${roomId}`);

    // Notify player of their game room and send initial game state if room is full
    if (game.players.length === 2) {
      io.to(roomId).emit('gameInit', { grid: game.grid, startingPlayer: game.currentPlayer });
    } else {
      // If the room is not yet full, wait for another player
      socket.emit('waitingForPlayer');
    }
  });

  socket.on('makeMove', ({ row, col, roomId }) => {
    const game = games.get(roomId);
    if (!game || game.players.indexOf(socket.id) !== game.players.indexOf(game.currentPlayer)) {
      return; // Ignore moves from non-current players or undefined games
    }

    const moveResult = processMove(game, row, col);
    if (moveResult.valid) {
      io.to(roomId).emit('moveMade', { grid: game.grid, nextPlayer: game.currentPlayer });
      if (moveResult.gameOver) {
        io.to(roomId).emit('gameOver', { winner: moveResult.winner, scores: game.scores });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Remove player from game and delete game if empty
    for (let [roomId, game] of games) {
      if (game.players.includes(socket.id)) {
        game.players.splice(game.players.indexOf(socket.id), 1);
        if (game.players.length === 0) {
          games.delete(roomId);
        } else {
          io.to(roomId).emit('playerDisconnected', { remainingPlayer: game.players[0] });
        }
        break;
      }
    }
  });
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
