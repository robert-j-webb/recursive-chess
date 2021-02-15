import { Component } from "react";
import PropTypes from "prop-types";
import { StockfishWrapper } from "./StockfishWrapper";

class Stockfish extends Component {
  private stockfishWrapper;
  static propTypes = { children: PropTypes.func };

  state = { fen: "start", score: 0, lastMove: [] };

  onMove = (from, to) => {
    // see if the move is legal
    const move = this.stockfishWrapper.game.move({
      from,
      to,
      promotion: "q",
    });

    // illegal move
    if (move === null) return;

    this.setState({ lastMove: [from, to] });

    return new Promise<void>((resolve) => {
      this.setState({ fen: this.stockfishWrapper.game.fen() });
      resolve();
    }).then(() => this.stockfishWrapper.prepareMove());
  };

  turnColor = () => {
    if (!this.stockfishWrapper) {
      return "w";
    }
    return this.stockfishWrapper.game.turn() === "w" ? "white" : "black";
  };

  calcMovable = () => {
    if (!this.stockfishWrapper) {
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
    this.stockfishWrapper.game.SQUARES.forEach((s) => {
      const ms = this.stockfishWrapper.game.moves({ square: s, verbose: true });
      if (ms.length)
        dests.set(
          s,
          ms.map((m) => m.to)
        );
    });
    return {
      free: false,
      dests,
      color: "white",
    };
  };

  async componentDidMount() {
    this.stockfishWrapper = new StockfishWrapper();
    await this.stockfishWrapper.init(
      (score) => this.setState({ score }),
      (from, to) => this.onMove(from, to)
    );

    this.setState({ fen: this.stockfishWrapper.game.fen() });

    this.stockfishWrapper.prepareMove();
  }

  render() {
    const { fen, score, lastMove } = this.state;
    return (this.props.children as any)({
      fen,
      onMove: this.onMove,
      score,
      lastMove,
      turnColor: this.turnColor,
      calcMovable: this.calcMovable,
    });
  }
}

export default Stockfish;
