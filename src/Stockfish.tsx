import { Component } from "react";
import PropTypes from "prop-types";
import { StockfishWrapper } from "./StockfishWrapper";

class Stockfish extends Component {
  private stockfishWrapper;
  static propTypes = { children: PropTypes.func };

  state = { fen: "start", score: 0 };

  onDrop = ({ sourceSquare, targetSquare }) => {
    // see if the move is legal
    const move = this.stockfishWrapper.game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    // illegal move
    if (move === null) return;

    return new Promise<void>((resolve) => {
      this.setState({ fen: this.stockfishWrapper.game.fen() });
      resolve();
    }).then(() => this.stockfishWrapper.prepareMove());
  };

  async componentDidMount() {
    this.stockfishWrapper = new StockfishWrapper();
    await this.stockfishWrapper.init((state) => this.setState(state));

    this.setState({ fen: this.stockfishWrapper.game.fen() });

    this.stockfishWrapper.prepareMove();
  }

  render() {
    const { fen, score } = this.state;
    return (this.props.children as any)({
      position: fen,
      onDrop: this.onDrop,
      score,
    });
  }
}

export default Stockfish;
