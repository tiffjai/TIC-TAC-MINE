import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './TicTacMinesweeper.css';

const TicTacMinesweeper = () => {
  const [grid, setGrid] = useState([]);
  const [mineLocations, setMineLocations] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [isMyTurn, setIsMyTurn] = useState(true); // Start with player 'X'
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('https://tic-tac-mine.onrender.com', {
      withCredentials: true,
      extraHeaders: {
        "my-custom-header": "abcd"
      }
    });

    setSocket(newSocket);

    newSocket.on('gameInit', (data) => {
      setGrid(data.grid);
      setMineLocations(data.mines);
      setCurrentPlayer(data.startingPlayer);
      setIsMyTurn(data.startingPlayer === currentPlayer);
      setGameOver(false);
      setWinner(null);
    });

    newSocket.on('move', (data) => {
      setGrid(data.grid);
      setCurrentPlayer(data.nextPlayer);
      setIsMyTurn(data.nextPlayer === currentPlayer);
    });

    newSocket.on('minesRevealed', (data) => {
      setGrid(data.grid);
      setGameOver(true);
      setWinner(data.triggeredBy); // Assuming the server sends who triggered the mine
    });

    newSocket.on('gameOver', (data) => {
      setGameOver(true);
      setWinner(data.winner);
    });

    return () => newSocket.disconnect();
  }, [currentPlayer]);

  useEffect(() => {
    if (socket) {
      socket.emit('initializeGame');
    }
  }, [socket]);

  const handleCellClick = (row, col) => {
    if (!isMyTurn || grid[row][col].revealed || gameOver) return;

    if (mineLocations.some(mine => mine.row === row && mine.col === col)) {
      socket.emit('revealMines', { row, col, player: currentPlayer });
    } else {
      socket.emit('makeMove', { row, col, player: currentPlayer });
    }
  };

  return (
    <div className="game-container">
      <h1>Tic-Tac-Minesweeper</h1>
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
                className={`cell ${cell.revealed ? 'revealed' : ''} ${cell.value === '💣' ? 'mine' : ''}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
              >
                {cell.revealed ? cell.value : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      {gameOver && (
        <div className="game-over">
          {winner ? `Game Over! ${winner} wins!` : 'Game Over! Hit a mine!'}
          <button className="restart-button" onClick={() => socket.emit('initializeGame')}>Restart Game</button>
        </div>
      )}
    </div>
  );
};

export default TicTacMinesweeper;
