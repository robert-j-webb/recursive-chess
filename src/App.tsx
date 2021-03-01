import React, { useState, useEffect, CSSProperties } from "react";
import "./App.css";
import Game, { GameResult } from "./Game";
import PgnInput from "./PgnInput";
import Chessground from "react-chessground";
import "react-chessground/dist/styles/chessground.css";
import ScoreDisplay from "./ScoreDisplay";
import { StockfishWrapper, Score, ChessMove } from "./StockfishWrapper";
import { io, Socket } from "socket.io-client";
import { Move } from "chess.js";

type gameFunctor = (id: number, addGame: () => void) => JSX.Element;

let gameId = 0;

function App() {
  const socket = io("ws://localhost:3001");

  const [stockfishWrapper, setStockfishWrapper] = useState<StockfishWrapper>();
  const [games, setGames] = useState<{ id: number; func: gameFunctor }[]>([]);
  let addGame = (pgn?: string) => {
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
  useEffect(() => {
    socket.on("add", (pgn: string) => addGame(pgn));
    return () => void socket.off("add");
  });

  useEffect(() => {
    games.length < 1 && stockfishWrapper && setTimeout(addGame, 100);
  });

  if (!stockfishWrapper!) {
    return <div>Loading</div>;
  }
  const getBestMove = stockfishWrapper.getBestMove.bind(stockfishWrapper);
  const stopCalculations = stockfishWrapper.stopCalculations.bind(
    stockfishWrapper
  );

  addGame = (pgn?: string) => {
    setGames((games) => [
      ...games,
      {
        id: gameId++,
        func: initGame(getBestMove, stopCalculations, socket, pgn),
      },
    ]);
  };

  return (
    <div style={appContainer}>
      <button type="submit" value="Submit" onClick={() => addGame()}>
        AddGame
      </button>
      <div style={boardsContainer}>
        {games.map((game) => (
          <div style={gameWrapper} key={game.id}>
            {game.func(game.id, addGame)}
          </div>
        ))}
      </div>
    </div>
  );
}

function initGame(
  getBestMove: (
    history: Move[],
    searchMoves?: string
  ) => Promise<{ bestMove: ChessMove; score: Score; bestLine: string[] }>,
  stopCalculations: () => void,
  socket: Socket,
  pgn?: string
): gameFunctor {
  return (id: number, addGame: () => void) => (
    <Game
      getBestMove={getBestMove}
      stopCalculations={stopCalculations}
      socket={socket}
      id={id}
      addGame={addGame}
      prevGame={pgn}
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
            {isGameOver && <p>Game over: {gameOutcome}</p>}
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
              viewOnly={isGameOver}
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
