import { Component } from "react";
import PropTypes from "prop-types";
import { StockfishWrapper } from "./StockfishWrapper";
import Chess, { ChessInstance } from "chess.js";

class Stockfish extends Component {
  private stockfishWrapper = new StockfishWrapper();
  private game!: ChessInstance;

  static propTypes = { children: PropTypes.func };

  state = {
    fen: "start",
    score: 0,
    lastMove: [],
    bestMove: undefined,
    scoreDiff: 0,
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
    this.setState({ lastMove: [from, to], fen });

    const bestMove = await this.stockfishWrapper.getBestMove(prevHistory);
    const scoreDiff = prevScore - this.state.score;

    this.setState({ bestMove, scoreDiff });
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

  async componentDidMount() {
    this.game = (Chess as any)();
    await this.stockfishWrapper.init((score) => this.setState({ score }));

    this.setState({ fen: this.game.fen() });
  }

  render() {
    const { fen, score, lastMove, bestMove, scoreDiff } = this.state;
    return (this.props.children as any)({
      fen,
      onMove: this.onMove,
      score,
      lastMove,
      turnColor: this.turnColor,
      calcMovable: this.calcMovable,
      bestMove,
      scoreDiff,
      bestMoveArrow: bestMove
        ? { orig: bestMove![0], dest: bestMove![1], brush: "paleBlue" }
        : null,
    });
  }
}

export default Stockfish;
