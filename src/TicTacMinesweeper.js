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
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('move', (data) => {
      setGrid(data.grid);
      setCurrentPlayer(data.nextPlayer); // Use the nextPlayer sent from the server
      setIsMyTurn(data.nextPlayer !== currentPlayer); // Determine if it's this client's turn
    });

    newSocket.on('minesRevealed', () => {
      revealAllMines();
      setGameOver(true);
    });

    return () => newSocket.disconnect();
  }, [currentPlayer]);

  const handleCellClick = (row, col) => {
    if (!isMyTurn || grid[row][col].revealed || gameOver) return;

    const newGrid = grid.map((r, rowIndex) =>
      rowIndex === row ? r.map((c, colIndex) => 
        colIndex === col ? { ...c, revealed: true, value: currentPlayer } : c) : r
    );

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
    // Check row
    if (newGrid[row].every(cell => cell.value === currentPlayer && cell.revealed)) {
      setGameOver(true);
      setWinner(currentPlayer);
      updateScores(currentPlayer);
      return;
    }

    // Check column
    let columnWin = true;
    for (let i = 0; i < newGrid.length; i++) {
      if (newGrid[i][col].value !== currentPlayer || !newGrid[i][col].revealed) {
        columnWin = false;
        break;
      }
    }
    if (columnWin) {
      setGameOver(true);
      setWinner(currentPlayer);
      updateScores(currentPlayer);
      return;
    }

    // Check major diagonal (top-left to bottom-right)
    if (row === col) {
      if (newGrid.every((row, idx) => row[idx].value === currentPlayer && row[idx].revealed)) {
        setGameOver(true);
        setWinner(currentPlayer);
        updateScores(currentPlayer);
        return;
      }
    }

    // Check minor diagonal (top-right to bottom-left)
    if (row + col === newGrid.length - 1) {
      if (newGrid.every((row, idx) => row[newGrid.length - 1 - idx].value === currentPlayer && row[newGrid.length - 1 - idx].revealed)) {
        setGameOver(true);
        setWinner(currentPlayer);
        updateScores(currentPlayer);
        return;
      }
    }

    // Check for draw: if all cells are revealed and there is no winner
    const allCellsRevealed = newGrid.every(row => row.every(cell => cell.revealed));
    if (allCellsRevealed && !winner) {
      setGameOver(true);
      setWinner('Draw');
    }
  };

  const updateScores = (winner) => {
    setScores((prevScores) => ({
      ...prevScores,
      [winner]: prevScores[winner] + 1
    }));
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
    const newGrid = Array(9).fill().map(() => Array(9).fill({ revealed: false, value: null }));
    const mines = placeMines(10);
    setGrid(newGrid);
    setMineLocations(mines);
    setGameOver(false);
    setCurrentPlayer('X');
    setWinner(null);
    setIsMyTurn(true); // Reset turn for the new game
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
      {gameOver && <div className="game-over">{winner ? `Game Over! ${winner} wins!` : 'Game Over! Hit a mine!'}</div>}
      <button className="restart-button" onClick={initializeGame}>Restart Game</button>
    </div>
  );
};

export default TicTacMinesweeper;
