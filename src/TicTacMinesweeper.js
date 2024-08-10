import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './TicTacMinesweeper.css';

const TicTacMinesweeper = () => {
  const [grid, setGrid] = useState(Array(9).fill().map(() => Array(9).fill({ revealed: false, value: null })));
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

    newSocket.on('move', (data) => {
      setGrid(data.grid);
      setCurrentPlayer(data.nextPlayer); // Use the nextPlayer sent from the server
      setIsMyTurn(data.nextPlayer === currentPlayer); // Determine if it's this client's turn
    });

    newSocket.on('minesRevealed', () => {
      revealAllMines();
      setGameOver(true);
    });

    return () => newSocket.disconnect();
  }, [currentPlayer]);

  useEffect(() => {
    initializeGame();
  }, []);

  const handleCellClick = (row, col) => {
    if (!isMyTurn || grid[row][col].revealed || gameOver) return;

    const newGrid = [...grid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = { ...newGrid[row][col], revealed: true, value: currentPlayer };

    const isMine = mineLocations.some(mine => mine.row === row && mine.col === col);

    if (isMine) {
      socket.emit('revealMines');
      revealAllMines();
      setGameOver(true);
    } else {
      setGrid(newGrid);
      checkGameStatus(newGrid, row, col);
      socket.emit('move', { grid: newGrid, nextPlayer: currentPlayer === 'X' ? 'O' : 'X' });
      setIsMyTurn(false); // End turn after move
    }
  };

  const checkGameStatus = (newGrid, row, col) => {
    const completeLine = (arr) => arr.every(cell => cell.value === currentPlayer && cell.revealed);

    // Check rows, columns, and diagonals for a winning line
    let rowWin = completeLine(newGrid[row]);
    let colWin = completeLine(newGrid.map(r => r[col]));
    let diag1Win = row === col && completeLine(newGrid.map((r, idx) => r[idx]));
    let diag2Win = row + col === newGrid.length - 1 && completeLine(newGrid.map((r, idx) => r[newGrid.length - 1 - idx]));

    if (rowWin || colWin || diag1Win || diag2Win) {
      setGameOver(true);
      setWinner(currentPlayer);
      updateScores(currentPlayer);
      return;
    }

    // Check for draw
    const allCellsRevealed = newGrid.every(row => row.every(cell => cell.revealed));
    if (allCellsRevealed && !winner) {
      setGameOver(true);
      setWinner('Draw');
    }
  };

  const updateScores = (winner) => {
    setScores(prev => ({ ...prev, [winner]: prev[winner] + 1 }));
  };

  const revealAllMines = () => {
    const newGrid = grid.map((row, rowIndex) =>
      row.map((cell, colIndex) =>
        mineLocations.some(mine => mine.row === rowIndex && mine.col === colIndex)
          ? { ...cell, revealed: true, value: '💣' } : cell
      ));
    setGrid(newGrid);
  };

  const initializeGame = () => {
    // Randomly place 10 mines
    const newMines = [];
    while (newMines.length < 10) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (!newMines.some(m => m.row === row && m.col === col)) {
        newMines.push({ row, col });
      }
    }
    setMineLocations(newMines);
    setGrid(Array(9).fill().map(() => Array(9).fill({ revealed: false, value: null })));
    setCurrentPlayer('X');
    setGameOver(false);
    setWinner(null);
    setIsMyTurn(currentPlayer === 'X');
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
              <div key={`${rowIndex}-${colIndex}`}
                   className={`cell ${cell.revealed ? 'revealed' : ''} ${cell.value === '💣' ? 'mine' : ''}`}
                   onClick={() => handleCellClick(rowIndex, colIndex)}>
                {cell.revealed ? cell.value : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      {gameOver && (
        <div className="game-over">
          {winner ? `Game Over! ${winner} wins!` : 'Game Over! Hit a mine!'}
        </div>
      )}
      <button className="restart-button" onClick={initializeGame}>Restart Game</button>
    </div>
  );
};

export default TicTacMinesweeper;
