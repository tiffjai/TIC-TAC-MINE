import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './TicTacMinesweeper.css';

const TicTacMinesweeper = () => {
  const [grid, setGrid] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [socket, setSocket] = useState(null);
  const [waitingForPlayer, setWaitingForPlayer] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'https://tic-tac-mine.onrender.com';
    console.log('Attempting to connect to server:', SERVER_URL);
    
    const newSocket = io(SERVER_URL, { 
      withCredentials: true,
      extraHeaders: {
        "my-custom-header": "abcd"
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Successfully connected to server');
      setConnectionError(null);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionError(`Failed to connect to server: ${error.message}`);
    });

    newSocket.on('gameInit', data => {
      console.log('Game initialized', data);
      setGrid(data.grid);
      setCurrentPlayer(data.startingPlayer);
      setGameOver(false);
      setWinner(null);
      setWaitingForPlayer(false);
      setCurrentRoomId(data.roomId);
      setPlayerSymbol(data.playerSymbol);
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

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.emit('joinRoom');
      console.log('Attempting to join room...');
    }
  }, [socket]);

  const handleCellClick = (row, col) => {
    if (!gameOver && grid[row][col].value === null && currentPlayer === playerSymbol) {
      console.log(`Attempting move: row ${row}, col ${col}`);
      socket.emit('makeMove', { row, col, roomId: currentRoomId });
    }
  };

  return (
    <div className="game-container">
      <h1>Tic-Tac-Minesweeper</h1>
      {connectionError && (
        <div className="error-message">
          {connectionError}
        </div>
      )}
      {waitingForPlayer ? (
        <div>Waiting for another player to join...</div>
      ) : (
        <>
          <div className="current-player">
            Current player: {currentPlayer}
          </div>
          <div className="player-symbol">
            Your symbol: {playerSymbol}
          </div>
          <div className="grid">
            {grid.map((row, rowIndex) => row.map((cell, colIndex) => (
              <div 
                key={`${rowIndex}-${colIndex}`} 
                className={`cell ${cell.revealed ? 'revealed' : ''} ${cell.isMine && cell.revealed ? 'mine' : ''}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
              >
                {cell.revealed ? (cell.isMine ? '💣' : cell.value || '') : ''}
              </div>
            )))}
          </div>
        </>
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