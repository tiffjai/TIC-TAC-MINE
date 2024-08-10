# Tic-Tac-Minesweeper

Tic-Tac-Minesweeper is an exciting blend of the classic Tic-Tac-Toe game and Minesweeper. Players take turns placing their marks (X or O) on a 9x9 grid, but beware - there are hidden mines! The game ends when a player completes a line of three marks or when a player hits a mine.

## Features

- 9x9 grid gameplay
- Two-player turn-based system
- Hidden mines add an element of risk and strategy
- Real-time multiplayer using Socket.IO
- Responsive design for both desktop and mobile play

## Live Demo

You can play the game live at: [https://tiffjai.github.io/tic-tac-minesweeper](https://tiffjai.github.io/tic-tac-minesweeper)

## Technology Stack

- Frontend: React.js
- Backend: Node.js with Express
- Real-time Communication: Socket.IO
- Hosting: GitHub Pages (Frontend), Render.com (Backend)

## Local Development

To set up the project locally, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/tiffjai/tic-tac-minesweeper.git
   cd tic-tac-minesweeper
   ```

2. Install dependencies for both frontend and backend:
   ```
   # Install frontend dependencies
   cd client
   npm install

   # Install backend dependencies
   cd ../server
   npm install
   ```

3. Set up environment variables:
   - In the `client` directory, create a `.env` file with:
     ```
     REACT_APP_SERVER_URL=http://localhost:3001
     ```
   - In the `server` directory, create a `.env` file with:
     ```
     PORT=3001
     ```

4. Start the development servers:
   - For the backend:
     ```
     cd server
     npm start
     ```
   - For the frontend:
     ```
     cd client
     npm start
     ```

5. Open [http://localhost:3000](http://localhost:3000) to view the game in your browser.

## How to Play

1. Open the game link in your browser.
2. Wait for another player to join the game.
3. Players take turns clicking on cells to place their mark (X or O).
4. The goal is to create a line of three of your marks horizontally, vertically, or diagonally.
5. Be careful! Some cells contain hidden mines. Clicking on a mine ends the game, and the other player wins.
6. The game ends when a player creates a line of three marks or when a mine is revealed.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Inspired by the classic games Tic-Tac-Toe and Minesweeper
- Thanks to [Socket.IO](https://socket.io/) for making real-time gameplay possible
- Shoutout to the React and Node.js communities for their excellent documentation and resources
