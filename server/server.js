const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const socketServer = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.get('/', (req, res) => {
  res.send("Server is running!");
});

const games = new Map();

function initializeGame() {
  const grid = Array(3).fill().map(() => Array(3).fill().map(() => ({ revealed: false, value: null, isMine: false })));
  return { grid, currentPlayer: 'X', players: [], scores: { X: 0, O: 0 } };
}

function processMove(game, row, col, playerSymbol) {
  console.log(`Processing move: row ${row}, col ${col}`);
  console.log(`Current game state:`, JSON.stringify(game, null, 2));

  if (game.grid[row][col].value !== null) {
    console.log(`Cell already occupied`);
    return { valid: false };
  }
  
  game.grid[row][col].value = playerSymbol;
  game.grid[row][col].revealed = true;

  const gameResult = checkGameStatus(game);
  game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

  console.log(`Move processed. New game state:`, JSON.stringify(game, null, 2));
  console.log(`Game result:`, gameResult);

  return { valid: true, ...gameResult };
}

function checkGameStatus(game) {
  const winPatterns = [
    [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
    [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
    [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]]
  ];

  for (let pattern of winPatterns) {
    if (pattern.every(([r, c]) => game.grid[r][c].value === game.currentPlayer)) {
      return { gameOver: true, winner: game.currentPlayer };
    }
  }

  if (game.grid.every(row => row.every(cell => cell.value !== null))) {
    return { gameOver: true, winner: null }; // Draw
  }

  return { gameOver: false };
}

socketServer.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', () => {
    console.log(`Attempting to join room for socket ${socket.id}`);
    let room = [...games.entries()].find(([_, g]) => g.players.length < 2);
    
    if (!room) {
      const roomId = uuidv4();
      const newGame = initializeGame();
      games.set(roomId, newGame);
      room = [roomId, newGame];
      console.log(`Created new room ${roomId}`);
    }

    const [roomId, game] = room;
    const playerSymbol = game.players.length === 0 ? 'X' : 'O';
    game.players.push({ id: socket.id, symbol: playerSymbol });
    socket.join(roomId);

    console.log(`Player ${socket.id} joined room ${roomId} as ${playerSymbol}`);

    if (game.players.length === 2) {
      console.log(`Starting game in room ${roomId}`);
      socketServer.to(roomId).emit('gameInit', { 
        grid: game.grid, 
        startingPlayer: game.currentPlayer, 
        roomId 
      });
      game.players.forEach(player => {
        socketServer.to(player.id).emit('gameInit', {
          grid: game.grid,
          startingPlayer: game.currentPlayer,
          roomId,
          playerSymbol: player.symbol
        });
      });
    } else {
      console.log(`Waiting for second player in room ${roomId}`);
      socket.emit('waitingForPlayer');
    }
  });

  socket.on('makeMove', ({ row, col, roomId }) => {
    console.log(`Move received: row ${row}, col ${col}, room ${roomId}`);
    const game = games.get(roomId);
    if (!game) {
      console.log(`Game not found for room ${roomId}`);
      return;
    }
    const player = game.players.find(p => p.id === socket.id);
    if (!player || player.symbol !== game.currentPlayer) {
      console.log(`Not current player's turn: ${socket.id}`);
      return;
    }
    const result = processMove(game, row, col, player.symbol);
    console.log(`Move result:`, result);
    if (result.valid) {
      console.log(`Valid move made in room ${roomId}`);
      socketServer.to(roomId).emit('moveMade', { grid: game.grid, nextPlayer: game.currentPlayer });
      if (result.gameOver) {
        console.log(`Game over in room ${roomId}. Winner: ${result.winner}`);
        socketServer.to(roomId).emit('gameOver', { winner: result.winner, scores: game.scores });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (let [roomId, game] of games) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        game.players.splice(playerIndex, 1);
        if (game.players.length === 0) {
          console.log(`Deleting empty room ${roomId}`);
          games.delete(roomId);
        } else {
          console.log(`Player disconnected from room ${roomId}. Notifying remaining player.`);
          socketServer.to(roomId).emit('playerDisconnected', { remainingPlayer: game.players[0].id });
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