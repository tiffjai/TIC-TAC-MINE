const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const socketServer = new Server(server, {
  cors: {
    origin: "https://tiffjai.github.io",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const games = new Map();

function initializeGame() {
  const grid = Array(9).fill().map(() => Array(9).fill().map(() => ({ value: null, revealed: false, isMine: false })));
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

function processMove(game, row, col, playerSymbol) {
  if (game.grid[row][col].revealed) return { valid: false };
  
  game.grid[row][col].revealed = true;
  
  if (game.grid[row][col].isMine) {
    return { valid: true, hitMine: true, grid: game.grid };
  }

  game.grid[row][col].value = playerSymbol;
  const nextPlayer = playerSymbol === 'X' ? 'O' : 'X';
  
  return { valid: true, hitMine: false, grid: game.grid, nextPlayer };
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
      game.players.forEach(player => {
        socketServer.to(player.id).emit('gameInit', {
          grid: game.grid.map(row => row.map(cell => ({ ...cell, isMine: false }))),
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
      game.currentPlayer = result.nextPlayer;
      socketServer.to(roomId).emit('moveMade', {
        grid: result.grid.map(row => row.map(cell => ({ ...cell, isMine: cell.revealed ? cell.isMine : false }))),
        nextPlayer: game.currentPlayer,
        hitMine: result.hitMine
      });
      if (result.hitMine) {
        socketServer.to(roomId).emit('gameOver', { winner: result.nextPlayer });
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