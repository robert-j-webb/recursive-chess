import React from "react";
import "./App.css";
import Chessboard from "chessboardjsx";
import Stockfish from "./Stockfish";

function App() {
  return (
    <div style={boardsContainer}>
      <Stockfish>
        {({ position, onDrop, score }) => (
          <div>
            <Chessboard
              id="stockfish"
              position={position}
              width={320}
              onDrop={onDrop}
              boardStyle={boardStyle}
              orientation="white"
            />
            <span>score: {score}</span>
          </div>
        )}
      </Stockfish>
    </div>
  );
}

const boardsContainer = {
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
};
const boardStyle = {
  borderRadius: "5px",
  boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`,
};

export default App;
