import React, { useState, useEffect, CSSProperties } from "react";
import "./App.css";
import Game, { GameResult } from "./Game";
import PgnInput from "./PgnInput";
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import ScoreDisplay from "./ScoreDisplay";
import { StockfishWrapper, Score, ScoreType } from "./StockfishWrapper";
import { io } from "socket.io-client";

type gameFunctor = (id: number) => JSX.Element;

let gameId = 0;

function App() {
  const socket = io("ws://localhost:3001");

  const [stockfishWrapper, setStockfishWrapper] = useState<StockfishWrapper>();
  const [games, setGames] = useState<{ id: number; func: gameFunctor }[]>([]);
  let addGame = () => {
    return;
  };
  useEffect(
    () => {
      new StockfishWrapper()
        .init()
        .then((wrapper) => setStockfishWrapper(wrapper));
    },
    [] /* never rerender */
  );
  useEffect(() => void socket.on("add", addGame));

  useEffect(() => {
    games.length < 1 && setTimeout(addGame, 1000);
  });

  if (!stockfishWrapper!) {
    return <div>Loading</div>;
  }
  const getBestMove = stockfishWrapper.getBestMove.bind(stockfishWrapper);
  const stopCalculations = stockfishWrapper.stopCalculations.bind(
    stockfishWrapper
  );

  addGame = () => {
    setGames(
      games.concat([
        {
          id: gameId++,
          func: initGame(getBestMove, stopCalculations, socket),
        },
      ])
    );
  };

  return (
    <div style={appContainer}>
      <button type="submit" value="Submit" onClick={addGame}>
        AddGame
      </button>
      <div style={boardsContainer}>
        {games.map((game) => (
          <div style={gameWrapper} key={game.id}>
            {game.func(game.id)}
          </div>
        ))}
      </div>
    </div>
  );
}

function initGame(
  getBestMove,
  stopCalculations,
  socket
): (id: number) => JSX.Element {
  return (id: number) => (
    <Game
      getBestMove={getBestMove}
      stopCalculations={stopCalculations}
      socket={socket}
      id={id}
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
        score,
        bestLine,
        gameOutcome,
      }) => {
        const isGameOver = gameOutcome !== GameResult.ONGOING;

        const scoreJsx = (
          <div style={scoreDisplay}>
            {!isGameOver && <p>Game over: {gameOutcome}</p>}
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
              viewOnly={gameOutcome !== GameResult.ONGOING}
              drawable={
                !isGameOver && bestMoveArrow
                  ? { autoShapes: [bestMoveArrow] }
                  : {}
              }
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
  );
}

const appContainer = {
  border: "1px solid black",
  width: "1265px",
};

const boardsContainer: CSSProperties = {
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  flexDirection: "column",
};

const gameWrapper = {
  borderRadius: "5px",
  boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`,
  height: "800px",
  width: "489px",
  overflow: "hidden",
};

const scoreDisplay = {
  maxWidth: "fit-content",
  height: "156px",
};

export default App;
