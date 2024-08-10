import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './TicTacMinesweeper.css';

const TicTacMinesweeper = () => {
  const [grid, setGrid] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('https://tic-tac-mine.onrender.com', { withCredentials: true });
    setSocket(newSocket);

    newSocket.on('gameInit', data => {
      setGrid(data.grid);
      setCurrentPlayer(data.startingPlayer);
      setGameOver(false);
      setWinner(null);
    });

    newSocket.on('moveMade', data => {
      setGrid(data.grid);
      setCurrentPlayer(data.nextPlayer);
    });

    newSocket.on('gameOver', data => {
      setGameOver(true);
      setWinner(data.winner);
    });

    return () => newSocket.disconnect();
  }, []);

  const handleCellClick = (row, col) => {
    if (!gameOver && grid[row][col].value === null) {
      socket.emit('makeMove', { row, col });
    }
  };

  return (
    <div className="game-container">
      <h1>Tic-Tac-Minesweeper</h1>
      <div className="grid">
        {grid.map((row, rowIndex) => row.map((cell, colIndex) => (
          <div key={`${rowIndex}-${colIndex}`} 
               className={`cell ${cell.revealed ? 'revealed' : ''} ${cell.isMine ? 'mine' : ''}`}
               onClick={() => handleCellClick(rowIndex, colIndex)}>
            {cell.revealed ? (cell.isMine ? '💣' : cell.value) : ''}
          </div>
        )))}
      </div>
      {gameOver && (
        <div className="game-over">
          Game Over! {winner ? `${winner} wins!` : 'It\'s a draw!'}
        </div>
      )}
    </div>
  );
};

export default TicTacMinesweeper;

