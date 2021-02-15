import React from "react";
import "./App.css";
import Stockfish from "./Stockfish";
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";

function App() {
  return (
    <div style={boardsContainer}>
      <Stockfish>
        {({
          fen,
          onMove,
          score,
          turnColor,
          calcMovable,
          lastMove,
          bestMove,
          scoreDiff,
          bestMoveArrow,
        }) => (
          <div>
            <Chessground
              width="38vw"
              height="38vw"
              turnColor={turnColor()}
              movable={calcMovable()}
              // lastMove={lastMove}
              fen={fen}
              onMove={onMove}
              style={{ margin: "auto" }}
              drawable={bestMoveArrow ? { autoShapes: [bestMoveArrow] } : {}}
            />
            <p>score: {score}</p>
            <p>bestMove: {bestMove}</p>
            <p>scoreDiff: {scoreDiff}</p>
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
