import { Component } from "react";
import PropTypes from "prop-types";
import { ScoreType, Score, ChessMove } from "./StockfishWrapper";
import Chess, { ChessInstance, Move, Square } from "chess.js";
import { diffScores } from "./ScoreDisplay";
import { Socket } from "socket.io-client";
import { addGame } from "./GlobalState";

interface Props {
  children: unknown;
  getBestMove: (
    history: Move[],
    searchMoves?: string
  ) => Promise<{ bestMove: ChessMove; score: Score; bestLine: string[] }>;
  stopCalculations: () => void;
  addGame: (pgn: string) => void;
  socket: Socket;
  id: number;
  prevGame?: string;
}
export enum GameResult {
  WHITE_WIN = "White Won",
  BLACK_WIN = "Black Won",
  DRAW = "Draw",
  ONGOING = 0,
}

class Game extends Component<Props> {
  private game!: ChessInstance;

  static propTypes = {
    children: PropTypes.func,
    getBestMove: PropTypes.func,
    stopCalculations: PropTypes.func,
    addGame: PropTypes.func,
    socket: PropTypes.instanceOf(Socket),
    id: PropTypes.number,
    prevGame: PropTypes.string,
  };

  state = {
    fen: "start",
    bestMove: undefined,
    scoreDiff: undefined,
    isCalculating: false,
    didInterrupt: false,
    pgn: "",
    score: new Score(0, ScoreType.Centipawns),
    bestLine: "",
    gameOutcome: GameResult.ONGOING,
  };

  onMove = async (from: any, to: any, options?: { fromSocket: boolean }) => {
    const prevScore = this.state.score;
    const prevHistory = this.game.history({ verbose: true });
    // see if the move is legal
    const move = this.game.move({
      from,
      to,
      promotion: "q",
    });

    // illegal move or game is already over
    if (move === null || this.state.gameOutcome !== 0) return;

    if (!options?.fromSocket) {
      this.props.socket.emit("move", `${this.props.id},${from},${to}`);
    }
    const fen = this.game.fen();

    const gameOutcome = isGameOver(this.game);
    if (gameOutcome !== 0) {
      return this.setState({
        gameOutcome,
        fen,
        pgn: this.game.pgn(),
      });
    }

    if (this.state.isCalculating) {
      this.props.stopCalculations();
      this.setState({ didInterrupt: true });
    }

    this.setState({
      fen,
      pgn: this.game.pgn(),
      isCalculating: true,
    });

    // We ask stockfish what was the best possible move the player could have made.
    const { bestMove, score: bestPossbileScore } = await this.props.getBestMove(
      prevHistory
    );

    // By limiting the search to the move the player made, we can force stockfish to give us the actual move score.
    const { score: actualMoveScore, bestLine } = await this.props.getBestMove(
      prevHistory,
      `${from}${to}`
    );

    if (actualMoveScore.type === ScoreType.Mate && bestLine.length > 1) {
      this.onMove(bestLine[1].slice(0, 2), bestLine[1].slice(2, 4));
    }

    const scoreDiff = diffScores(
      actualMoveScore,
      prevScore,
      bestPossbileScore,
      this.game.turn()
    );

    if (scoreDiff.includes("fuck") && !options?.fromSocket) {
      const newGame: ChessInstance = (Chess as any)();
      newGame.load_pgn(this.game.pgn());
      newGame.undo();
      newGame.move({
        from: bestMove[0] as Square,
        to: bestMove[1] as Square,
        promotion: "q",
      });
      this.props.addGame(newGame.pgn());
      this.props.socket.emit("add", newGame.pgn());
    }

    this.setState({
      isCalculating: false,
      bestMove,
      bestLine,
      didInterrupt: false,
      score: actualMoveScore,
      scoreDiff,
    });
  };

  turnColor = () => {
    if (!this.game) {
      return "w";
    }
    return this.game.turn() === "w" ? "white" : "black";
  };

  calcMovable = () => {
    if (!this.game) {
      return {
        free: false,
        color: "white",
        showDests: false,
        dests: new Map([
          ["a2", ["a3", "a4"]],
          ["b2", ["b3", "b4"]],
          ["c2", ["c3", "c4"]],
          ["d2", ["d3", "d4"]],
          ["e2", ["e3", "e4"]],
          ["f2", ["f3", "f4"]],
          ["g2", ["g3", "g4"]],
          ["h2", ["h3", "h4"]],
          ["b1", ["a3", "c3"]],
          ["g1", ["f3", "h3"]],
        ]),
      };
    }
    const dests = new Map();
    this.game.SQUARES.forEach((s) => {
      const ms = this.game.moves({ square: s, verbose: true });
      if (ms.length)
        dests.set(
          s,
          ms.map((m) => m.to)
        );
    });
    return {
      free: false,
      dests,
      color: this.game.turn() === "w" ? "white" : "black",
    };
  };

  async onFenSubmit(pgn: string) {
    const wasLoaded = this.game.load_pgn(pgn);
    if (!wasLoaded) {
      console.error("invalid pgn");
      return;
    }
    const prevMove = this.game.undo()!;
    this.setState({ score: 0 });
    this.onMove(prevMove.from, prevMove.to);
  }

  async componentDidMount() {
    this.game = (Chess as any)();
    if (this.props.prevGame) {
      this.game.load_pgn(this.props.prevGame);
    }
    addGame(this.game, this.props.id);

    this.props.socket.on("move", async (data: string) => {
      const [id, from, to] = data.split(",");
      if (Number(id) !== this.props.id) {
        return;
      }
      this.onMove(from, to, { fromSocket: true });
    });

    // When the global instance gets a synchronize event, we also want to force a rerender here.
    this.props.socket.on(
      "synchronize",
      async () =>
        void setTimeout(() => {
          const prevMove = this.game.undo()!;
          this.setState({ score: 0 });
          if (prevMove) {
            this.onMove(prevMove.from, prevMove.to, { fromSocket: true });
          }
        }, 10)
    );

    this.setState({ fen: this.game.fen() });
  }

  render() {
    const { bestMove } = this.state;
    return (this.props.children as any)({
      ...this.state,
      onMove: this.onMove,
      turnColor: this.turnColor,
      calcMovable: this.calcMovable,
      onFenSubmit: this.onFenSubmit.bind(this),
      bestMoveArrow: bestMove
        ? { orig: bestMove![0], dest: bestMove![1], brush: "paleBlue" }
        : null,
    });
  }
}

function isGameOver(game: ChessInstance): GameResult {
  if (game.in_checkmate()) {
    // The current player is mated so we have to invert color
    return game.turn() === "w" ? GameResult.BLACK_WIN : GameResult.WHITE_WIN;
  }

  if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
    return GameResult.DRAW;
  }
  return GameResult.ONGOING;
}

export default Game;
