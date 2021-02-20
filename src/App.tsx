import React from "react";
import "./App.css";
import Stockfish from "./Stockfish";
import PgnInput from "./PgnInput";
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import ScoreDisplay from "./ScoreDisplay";

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
          didInterrupt,
          bestMoveArrow,
          isCalculating,
          onFenSubmit,
          pgn,
        }) => {
          const scoreJsx = (
            <div>
              <ScoreDisplay score={score} />
              <p>bestMove: {bestMove}</p>
              <p>scoreDiff: {scoreDiff}</p>
            </div>
          );

          return (
            <div>
              <p>Pgn Input</p>
              <PgnInput onSubmit={onFenSubmit} />
              <Chessground
                width="38vw"
                height="38vw"
                turnColor={turnColor()}
                movable={calcMovable()}
                // lastMove={lastMove}
                fen={fen}
                onMove={onMove}
                style={{ margin: "auto" }}
                // viewOnly={isCalculating}
                drawable={bestMoveArrow ? { autoShapes: [bestMoveArrow] } : {}}
              />
              {!isCalculating ? scoreJsx : <p>Calculating...</p>}
              {didInterrupt && (
                <p>You interrupted the engine. You won't see shenanigans</p>
              )}
              <p>Current PGN: </p>
              <p>{pgn}</p>
            </div>
          );
        }}
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
