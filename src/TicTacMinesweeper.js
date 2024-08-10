import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import './TicTacMinesweeper.css';

const TicTacMinesweeper = () => {
  const [grid, setGrid] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [socket, setSocket] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const socketUrl = 'https://tic-tac-mine.onrender.com';
    const newSocket = io(socketUrl, { withCredentials: true });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('joinRoom');
    });

    newSocket.on('playerId', id => {
      setPlayerId(id);
    });

    newSocket.on('joinedRoom', data => {
      setRoomId(data.roomId);
    });

    newSocket.on('waitingForPlayer', () => {
      setWaiting(true);
    });

    newSocket.on('gameInit', data => {
      setWaiting(false);
      setGrid(data.grid);
      setCurrentPlayer(data.startingPlayer);
      setIsMyTurn(data.startingPlayer === playerId);
      setGameOver(false);
      setWinner(null);
    });

    newSocket.on('move', data => {
      setGrid(data.grid);
      setCurrentPlayer(data.nextPlayer);
      setIsMyTurn(data.nextPlayer === playerId);
    });

    newSocket.on('minesRevealed', data => {
      setGrid(data.grid);
      setGameOver(true);
      setWinner(data.winner);
    });

    newSocket.on('gameOver', data => {
      setGameOver(true);
      setWinner(data.winner);
      setScores(data.scores);
    });

    newSocket.on('error', error => {
      console.error('Socket error:', error);
    });

    return () => newSocket.disconnect();
  }, [playerId]);

  const handleCellClick = useCallback((row, col) => {
    if (!isMyTurn || gameOver) return;
    socket.emit('makeMove', { row, col, roomId });
  }, [isMyTurn, gameOver, socket, roomId]);

  const handleRestartGame = useCallback(() => {
    socket.emit('restartGame', { roomId });
  }, [socket, roomId]);

  return (
    <div className="game-container">
      <h1>Tic-Tac-Minesweeper</h1>
      {waiting ? (
        <p>Waiting for another player to join...</p>
      ) : roomId ? (
        <>
          <div className="scores">
            <div>Player X: {scores.X}</div>
            <div>Player O: {scores.O}</div>
          </div>
          <div className="current-player">Current Player: {currentPlayer}</div>
          <div className="grid">
            {grid.map((row, rowIndex) => (
              <div key={rowIndex} className="row">
                {row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`cell ${cell.revealed ? 'revealed' : ''} ${cell.isMine && cell.revealed ? 'mine' : ''}`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                  >
                    {cell.revealed ? (cell.isMine ? '💣' : cell.value) : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {gameOver && (
            <div className="game-over">
              {winner ? `Game Over! ${winner} wins!` : 'Game Over! It\'s a draw!'}
              <button className="restart-button" onClick={handleRestartGame}>Restart Game</button>
            </div>
          )}
        </>
      ) : (
        <p>Connecting to server...</p>
      )}
    </div>
  );
};

export default TicTacMinesweeper;
