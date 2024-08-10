import React, { useState, useEffect } from 'react';
import './TicTacMinesweeper.css';

const TicTacMinesweeper = () => {
  const [grid, setGrid] = useState([]);
  const [mineLocations, setMineLocations] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [gameOver, setGameOver] = useState(false);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [consecutiveMoves, setConsecutiveMoves] = useState({ X: 0, O: 0 });
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const newGrid = Array(9).fill().map(() => Array(9).fill({ revealed: false, value: null }));
    const mines = placeMines(10); // Place 10 mines randomly
    setGrid(newGrid);
    setMineLocations(mines);
    setGameOver(false);
    setCurrentPlayer('X');
    setScores({ X: 0, O: 0 });
    setConsecutiveMoves({ X: 0, O: 0 });
    setWinner(null);
  };

  const placeMines = (count) => {
    const mines = [];
    while (mines.length < count) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (!mines.some(mine => mine.row === row && mine.col === col)) {
        mines.push({ row, col });
      }
    }
    return mines;
  };

  const handleCellClick = (row, col) => {
    if (gameOver || grid[row][col].revealed) return;

    const newGrid = [...grid];
    const isMine = mineLocations.some(mine => mine.row === row && mine.col === col);

    if (isMine) {
      setGameOver(true);
      revealAllMines();
      setConsecutiveMoves(prevMoves => ({ ...prevMoves, [currentPlayer]: 0 }));
    } else {
      newGrid[row][col] = { ...newGrid[row][col], revealed: true, value: currentPlayer };
      setGrid(newGrid);
      
      // Award points for successful move
      setScores(prevScores => ({
        ...prevScores,
        [currentPlayer]: prevScores[currentPlayer] + 1
      }));

      // Check for completed tic-tac-toe games
      const completedGames = checkCompletedGames(newGrid, row, col);
      if (completedGames > 0) {
        setScores(prevScores => ({
          ...prevScores,
          [currentPlayer]: prevScores[currentPlayer] + completedGames * 10
        }));
      }

      // Increment consecutive moves for current player
      const newConsecutiveMoves = consecutiveMoves[currentPlayer] + 1;
      setConsecutiveMoves(prevMoves => ({
        ...prevMoves,
        [currentPlayer]: newConsecutiveMoves
      }));

      // Check if the game is over due to three consecutive moves
      if (newConsecutiveMoves === 3) {
        setGameOver(true);
        setWinner(currentPlayer);
      } else {
        setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
      }
    }
  };

  const revealAllMines = () => {
    const newGrid = [...grid];
    mineLocations.forEach(mine => {
      newGrid[mine.row][mine.col] = { ...newGrid[mine.row][mine.col], revealed: true, value: '💣' };
    });
    setGrid(newGrid);
  };

  const checkCompletedGames = (newGrid, row, col) => {
    // ... (keep the existing checkCompletedGames function)
  };

  const renderCell = (cell, row, col) => {
    let cellContent = '';
    if (cell.revealed) {
      cellContent = cell.value === '💣' ? '💣' : cell.value || '';
    }

    return (
      <div
        key={`${row}-${col}`}
        className={`cell ${cell.revealed ? 'revealed' : ''} ${cellContent === '💣' ? 'mine' : ''}`}
        onClick={() => handleCellClick(row, col)}
      >
        {cellContent}
      </div>
    );
  };

  return (
    <div className="game-container">
      <h1>Tic-Tac-Minesweeper</h1>
      <div className="scores">
        <div>Player X: {scores.X}</div>
        <div>Player O: {scores.O}</div>
      </div>
      <div className="current-player">Current Player: {currentPlayer}</div>
      <div className="consecutive-moves">
        <div>X Consecutive Moves: {consecutiveMoves.X}</div>
        <div>O Consecutive Moves: {consecutiveMoves.O}</div>
      </div>
      <div className="grid">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((cell, colIndex) => renderCell(cell, rowIndex, colIndex))}
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