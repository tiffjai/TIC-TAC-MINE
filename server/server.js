const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.get('/', (req, res) => {
  res.send("Server is running!");
});

const games = new Map();

const initializeGame = () => {
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

  return {
    grid,
    mineLocations,
    currentPlayer: 'X',
    players: [],
    scores: { X: 0, O: 0 }
  };
};

const processMove = (game, row, col) => {
  if (game.grid[row][col].revealed) return { valid: false };

  game.grid[row][col].revealed = true;
  
  if (game.grid[row][col].isMine) {
    return { valid: true, hitMine: true };
  }

  game.grid[row][col].value = game.currentPlayer;

  const gameResult = checkGameStatus(game);
  game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

  return { valid: true, hitMine: false, ...gameResult };
};

const checkGameStatus = (game) => {
  const winPatterns = [
    [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]], // Rows
    [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]], // Columns
    [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]] // Diagonals
  ];

  for (let pattern of winPatterns) {
    if (pattern.every(([row, col]) => 
      game.grid[row][col].revealed && 
      game.grid[row][col].value === game.currentPlayer)) {
      return { gameOver: true, winner: game.currentPlayer };
    }
  }

  if (game.grid.every(row => row.every(cell => cell.revealed))) {
    return { gameOver: true, winner: null }; // Draw
  }

  return { gameOver: false };
};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.emit('playerId', socket.id);

  socket.on('joinRoom', () => {
    let room = [...games.entries()].find(([_, game]) => game.players.length < 2);
    
    if (!room) {
      const roomId = uuidv4();
      games.set(roomId, initializeGame());
      room = [roomId, games.get(roomId)];
    }

    const [roomId, game] = room;
    game.players.push(socket.id);
    socket.join(roomId);
    socket.emit('joinedRoom', { roomId });

    if (game.players.length === 2) {
      io.to(roomId).emit('gameInit', {
        grid: game.grid,
        startingPlayer: game.currentPlayer
      });
    }
  });

  socket.on('makeMove', ({ row, col, roomId }) => {
    const game = games.get(roomId);
    if (!game || game.players[game.players.indexOf(socket.id)] !== game.currentPlayer) return;

    const result = processMove(game, row, col);
    if (result.valid) {
      if (result.hitMine) {
        game.scores[game.currentPlayer === 'X' ? 'O' : 'X']++;
        io.to(roomId).emit('minesRevealed', { grid: game.grid, winner: game.currentPlayer === 'X' ? 'O' : 'X' });
      } else {
        io.to(roomId).emit('move', { grid: game.grid, nextPlayer: game.currentPlayer });
        if (result.gameOver) {
          if (result.winner) game.scores[result.winner]++;
          io.to(roomId).emit('gameOver', { winner: result.winner, scores: game.scores });
        }
      }
    }
  });

  socket.on('restartGame', ({ roomId }) => {
    if (games.has(roomId)) {
      const newGame = initializeGame();
      newGame.players = games.get(roomId).players;
      newGame.scores = games.get(roomId).scores;
      games.set(roomId, newGame);
      io.to(roomId).emit('gameInit', {
        grid: newGame.grid,
        startingPlayer: newGame.currentPlayer
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (let [roomId, game] of games) {
      const playerIndex = game.players.indexOf(socket.id);
      if (playerIndex !== -1) {
        game.players.splice(playerIndex, 1);
        if (game.players.length === 0) {
          games.delete(roomId);
        } else {
          io.to(roomId).emit('playerDisconnected');
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