import { Component } from "react";
import PropTypes from "prop-types";
import { StockfishWrapper, ScoreType, Score } from "./StockfishWrapper";
import Chess, { ChessInstance } from "chess.js";
import { diffScores } from "./ScoreDisplay";

class Stockfish extends Component {
  private stockfishWrapper = new StockfishWrapper();
  private game!: ChessInstance;

  static propTypes = { children: PropTypes.func };

  state = {
    fen: "start",
    score: { val: 0, type: ScoreType.Centipawns } as Score,
    bestMove: undefined,
    scoreDiff: undefined,
    isCalculating: false,
    didInterrupt: false,
    pgn: "",
    bestLine: [] as string[],
  };

  onMove = async (from, to) => {
    const prevScore = this.state.score;
    const prevHistory = this.game.history({ verbose: true });
    // see if the move is legal
    const move = this.game.move({
      from,
      to,
      promotion: "q",
    });

    // illegal move
    if (move === null) return;

    const fen = this.game.fen();

    if (this.state.isCalculating) {
      this.stockfishWrapper.stopCalculations();
      this.setState({ didInterrupt: true });
    }

    this.setState({
      fen,
      pgn: this.game.pgn(),
      isCalculating: true,
    });

    // We ask stockfish what was the best possible move the player could have made.
    const bestMove = await this.stockfishWrapper.getBestMove(prevHistory);
    const bestPossbileScore = this.state.score;

    // By limiting the search to the move the player made, we can force stockfish to give us the actual move score.
    await this.stockfishWrapper.getBestMove(prevHistory, `${from}${to}`);
    const actualMoveScore = this.state.score;

    if (
      actualMoveScore.type === ScoreType.Mate &&
      this.state.bestLine.length > 1
    ) {
      this.onMove(
        this.state.bestLine[1].slice(0, 2),
        this.state.bestLine[1].slice(2, 4)
      );
    }

    this.setState({
      isCalculating: false,
      bestMove,
      didInterrupt: false,
      scoreDiff: diffScores(
        actualMoveScore,
        prevScore,
        bestPossbileScore,
        this.game.turn()
      ),
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
    await this.stockfishWrapper.init((score, bestLine) =>
      this.setState({ score, bestLine })
    );

    this.setState({ fen: this.game.fen() });
  }

  render() {
    const {
      fen,
      score,
      bestMove,
      scoreDiff,
      didInterrupt,
      isCalculating,
      pgn,
      bestLine,
    } = this.state;
    return (this.props.children as any)({
      fen,
      onMove: this.onMove,
      score,
      turnColor: this.turnColor,
      calcMovable: this.calcMovable,
      bestMove,
      scoreDiff,
      isCalculating,
      didInterrupt,
      onFenSubmit: this.onFenSubmit.bind(this),
      bestLine,
      pgn,
      bestMoveArrow: bestMove
        ? { orig: bestMove![0], dest: bestMove![1], brush: "paleBlue" }
        : null,
    });
  }
}

export default Stockfish;
