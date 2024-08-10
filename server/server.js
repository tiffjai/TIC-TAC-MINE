const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

const clientUrl = process.env.NODE_ENV === 'production'
  ? 'https://tic-tac-mine.onrender.com'
  : 'http://localhost:3000';

const io = socketIo(server, {
  cors: {
    origin: clientUrl,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.get('/', (req, res) => {
  res.send("Server is running!");
});

let grid = [];
let mineLocations = [];
let currentPlayer = 'X';

const initializeGame = () => {
  grid = Array(9).fill().map(() => Array(9).fill({ revealed: false, value: null, isMine: false }));
  mineLocations = [];

  while (mineLocations.length < 10) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (!mineLocations.some(mine => mine.row === row && mine.col === col)) {
      mineLocations.push({ row, col });
      grid[row][col] = { revealed: false, value: null, isMine: true };
    }
  }

  currentPlayer = 'X';
  return { grid, mines: mineLocations, startingPlayer: currentPlayer };
};

const processMove = (row, col, player) => {
  if (grid[row][col].revealed || grid[row][col].isMine) return { valid: false, grid };

  grid[row][col] = { ...grid[row][col], revealed: true, value: player };

  const gameResult = checkGameStatus(grid, player);
  const nextPlayer = player === 'X' ? 'O' : 'X';

  return { valid: true, grid, nextPlayer, ...gameResult };
};

const checkGameStatus = (grid, player) => {
  const completeLine = (arr) => arr.every(cell => cell.value === player && cell.revealed);

  for (let i = 0; i < grid.length; i++) {
    if (completeLine(grid[i])) return { gameOver: true, winner: player };
    if (completeLine(grid.map(row => row[i]))) return { gameOver: true, winner: player };
  }

  const diag1Win = completeLine(grid.map((row, idx) => row[idx]));
  const diag2Win = completeLine(grid.map((row, idx) => row[grid.length - 1 - idx]));

  if (diag1Win || diag2Win) return { gameOver: true, winner: player };

  const allCellsRevealed = grid.every(row => row.every(cell => cell.revealed));
  if (allCellsRevealed) return { gameOver: true, winner: null };

  return { gameOver: false };
};

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
