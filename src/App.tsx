import React, { useState, useEffect } from "react";
import "./App.css";
import Game from "./Game";
import PgnInput from "./PgnInput";
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import ScoreDisplay from "./ScoreDisplay";
import { StockfishWrapper, Score, ScoreType } from "./StockfishWrapper";
import { io } from "socket.io-client";

function App() {
  const socket = io("ws://localhost:3001");

  const [score, setScore] = useState<Score>(new Score(0, ScoreType.Centipawns));
  const [bestLine, setBestLine] = useState<string[]>([]);
  const [stockfishWrapper, setStockfishWrapper] = useState<StockfishWrapper>();
  useEffect(
    () => {
      new StockfishWrapper()
        .init(setScore, setBestLine)
        .then((wrapper) => setStockfishWrapper(wrapper));
    },
    [] /* never rerender */
  );
  if (!stockfishWrapper!) {
    return <div>Loading</div>;
  }
  const getBestMove = stockfishWrapper.getBestMove.bind(stockfishWrapper);
  const stopCalculations = stockfishWrapper.stopCalculations.bind(
    stockfishWrapper
  );
  return (
    <div style={boardsContainer}>
      <Game
        score={score}
        bestLine={bestLine}
        getBestMove={getBestMove}
        stopCalculations={stopCalculations}
        socket={socket}
      >
        {({
          fen,
          onMove,
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
              <p>Current Best Line: {bestLine}</p>
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
      </Game>
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
