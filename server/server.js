const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://tiffjai.github.io",   
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

function processMove(game, row, col) {
  if (game.grid[row][col].revealed) return { valid: false };
  game.grid[row][col].revealed = true;
  
  if (game.grid[row][col].isMine) {
    return { valid: true, hitMine: true };
  }

  game.grid[row][col].value = game.currentPlayer;
  const gameResult = checkGameStatus(game);
  game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

  return { valid: true, hitMine: false, ...gameResult };
}

function checkGameStatus(game) {
  const winPatterns = [
    [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
    [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
    [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]]
  ];

  for (let pattern of winPatterns) {
    if (pattern.every(([r, c]) => game.grid[r][c].revealed && game.grid[r][c].value === game.currentPlayer)) {
      return { gameOver: true, winner: game.currentPlayer };
    }
  }

  if (game.grid.every(row => row.every(cell => cell.revealed))) {
    return { gameOver: true, winner: null }; // Draw
  }

  return { gameOver: false };
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', () => {
    let room = [...games.entries()].find(([_, g]) => g.players.length < 2);
    
    if (!room) {
        const roomId = uuidv4();
        const newGame = initializeGame();
        games.set(roomId, newGame);
        room = [roomId, newGame];
    }

    const [roomId, game] = room;
    game.players.push(socket.id);
    socket.join(roomId);

    console.log(`Player ${socket.id} joined room ${roomId}`);

    if (game.players.length === 2) {
        io.to(roomId).emit('gameInit', { grid: game.grid, startingPlayer: game.currentPlayer });
    } else {
        socket.emit('waitingForPlayer');
    }
  });

  socket.on('makeMove', ({ row, col, roomId }) => {
    const game = games.get(roomId);
    if (!game || game.players[game.currentPlayer] !== socket.id) {
        return;
    }
    const result = processMove(game, row, col);
    if (result.valid) {
        io.to(roomId).emit('moveMade', { grid: game.grid, nextPlayer: game.currentPlayer });
        if (result.gameOver) {
            io.to(roomId).emit('gameOver', { winner: result.winner, scores: game.scores });
        }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Remove player from game and delete game if empty
    for (let [roomId, game] of games) {
      if (game.players.includes(socket.id)) {
        game.players = game.players.filter(id => id !== socket.id);
        if (!game.players.length) {
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
