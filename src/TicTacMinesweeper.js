// TicTacMinesweeper.js (Client-side)
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './TicTacMinesweeper.css';

const TicTacMinesweeper = () => {
  const [grid, setGrid] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [socket, setSocket] = useState(null);
  const [waitingForPlayer, setWaitingForPlayer] = useState(false);

  useEffect(() => {
    const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'https://tic-tac-mine.onrender.com';
    const newSocket = io(SERVER_URL, { withCredentials: true });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    newSocket.on('gameInit', data => {
      console.log('Game initialized', data);
      setGrid(data.grid);
      setCurrentPlayer(data.startingPlayer);
      setGameOver(false);
      setWinner(null);
      setWaitingForPlayer(false);
    });

    newSocket.on('moveMade', data => {
      console.log('Move made', data);
      setGrid(data.grid);
      setCurrentPlayer(data.nextPlayer);
    });

    newSocket.on('gameOver', data => {
      console.log('Game over', data);
      setGameOver(true);
      setWinner(data.winner);
    });

    newSocket.on('waitingForPlayer', () => {
      console.log('Waiting for another player to join...');
      setWaitingForPlayer(true);
    });

    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.emit('joinRoom');
      console.log('Joining room...');
    }
  }, [socket]);

  const handleCellClick = (row, col) => {
    if (!gameOver && grid[row][col].value === null) {
      socket.emit('makeMove', { row, col });
    }
  };

  return (
    <div className="game-container">
      <h1>Tic-Tac-Minesweeper</h1>
      {waitingForPlayer ? (
        <div>Waiting for another player to join...</div>
      ) : (
        <div className="grid">
          {grid.map((row, rowIndex) => row.map((cell, colIndex) => (
            <div key={`${rowIndex}-${colIndex}`} 
                 className={`cell ${cell.revealed ? 'revealed' : ''} ${cell.isMine ? 'mine' : ''}`}
                 onClick={() => handleCellClick(rowIndex, colIndex)}>
              {cell.revealed ? (cell.isMine ? '💣' : cell.value) : ''}
            </div>
          )))}
        </div>
      )}
      {gameOver && (
        <div className="game-over">
          Game Over! {winner ? `${winner} wins!` : 'It\'s a draw!'}
        </div>
      )}
    </div>
  );
};

export default TicTacMinesweeper;