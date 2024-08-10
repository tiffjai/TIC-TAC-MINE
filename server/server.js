const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

// Set up CORS based on the environment for better security and control
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

// Global game state
let grid = [];
let mineLocations = [];
let currentPlayer = 'X';

// Function to initialize the game grid and mines
const initializeGame = () => {
  grid = Array(9).fill().map(() => Array(9).fill({ revealed: false, value: null }));
  mineLocations = [];

  // Randomly place 10 mines
  while (mineLocations.length < 10) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (!mineLocations.some(mine => mine.row === row && mine.col === col)) {
      mineLocations.push({ row, col });
    }
  }

  // Update grid to mark mine positions
  mineLocations.forEach(mine => {
    grid[mine.row][mine.col] = { ...grid[mine.row][mine.col], isMine: true };
  });

  currentPlayer = 'X';

  return { grid, mines: mineLocations, startingPlayer: currentPlayer };
};

// Function to handle moves
const processMove = (row, col, player) => {
  if (grid[row][col].revealed || grid[row][col].isMine) return { valid: false, grid };

  grid[row][col] = { ...grid[row][col], revealed: true, value: player };

  // Check for a win condition or draw
  const gameResult = checkGameStatus(grid, player);
  const nextPlayer = player === 'X' ? 'O' : 'X';

  return { valid: true, grid, nextPlayer, ...gameResult };
};

// Function to check for win conditions or draw
const checkGameStatus = (grid, player) => {
  const completeLine = (arr) => arr.every(cell => cell.value === player && cell.revealed);

  // Check rows, columns, and diagonals for a winning line
  for (let i = 0; i < grid.length; i++) {
    if (completeLine(grid[i])) return { gameOver: true, winner: player };
    if (completeLine(grid.map(row => row[i]))) return { gameOver: true, winner: player };
  }

  const diag1Win = completeLine(grid.map((row, idx) => row[idx]));
  const diag2Win = completeLine(grid.map((row, idx) => row[grid.length - 1 - idx]));

  if (diag1Win || diag2Win) return { gameOver: true, winner: player };

  // Check for draw
  const allCellsRevealed = grid.every(row => row.every(cell => cell.revealed));
  if (allCellsRevealed) return { gameOver: true, winner: null }; // Draw

  return { gameOver: false };
};

// Socket.io connection setup
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('initializeGame', () => {
    const gameData = initializeGame();
    io.emit('gameInit', gameData);
  });

  socket.on('makeMove', ({ row, col, player }) => {
    const result = processMove(row, col, player);
    if (result.valid) {
      io.emit('move', { grid: result.grid, nextPlayer: result.nextPlayer });
      if (result.gameOver) {
        io.emit('gameOver', { winner: result.winner });
      }
    }
  });

  socket.on('revealMines', ({ row, col, player }) => {
    console.log('Mine triggered by:', player);
    grid[row][col] = { ...grid[row][col], revealed: true };
    io.emit('minesRevealed', { grid, triggeredBy: player });
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
