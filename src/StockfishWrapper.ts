import Chess, { ChessInstance } from "chess.js";

declare global {
  interface Window {
    Stockfish: StockfishMessageWrapper;
  }
}

type MessageListener = (line: string) => unknown | void;

export class StockfishWrapper {
  private game!: ChessInstance;
  private stockfishWrapper!: StockfishMessageWrapper;
  private engineStatus!: EngineStatus;
  private time!: ChessTime;
  private playerColor!: "white" | "black";
  private setState!: (state: any) => void;

  async init(setStateFn: (state: any) => void) {
    this.setState = setStateFn;
    await window.Stockfish().then((sf) => {
      // webpack 😭
      this.game = (Chess as any)();
      sf.addMessageListener((line) => this.onMessage(line));
      this.time = {
        wtime: 3000,
        btime: 3000,
        winc: 1500,
        binc: 1500,
      };
      this.playerColor = "white";

      this.stockfishWrapper = sf;
      this.uciCmd("uci");
      this.uciCmd("ucinewgame");
      this.uciCmd("isready");
      this.engineStatus = {
        engineLoaded: true,
        score: 0,
        engineReady: false,
        search: "",
      };
    });
  }

  uciCmd(msg: string) {
    this.stockfishWrapper.postMessage(msg);
  }

  onMessage(event: any) {
    const line = event && typeof event === "object" ? event.data : event;

    console.log("Reply: " + line);
    if (line === "uciok") {
      this.engineStatus.engineLoaded = true;
    } else if (line === "readyok") {
      this.engineStatus.engineReady = true;
    } else {
      let match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
      /// Did the AI move?
      if (match) {
        // isEngineRunning = false;
        this.game.move({ from: match[1], to: match[2], promotion: match[3] });
        this.setState({ fen: this.game.fen() });
        this.prepareMove();
        /// Is it sending feedback?
      } else if ((match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/))) {
        this.engineStatus.search = "Depth: " + match[1] + " Nps: " + match[2];
      }

      /// Is it sending feed back with a score?
      if ((match = line.match(/^info .*\bscore (\w+) (-?\d+)/))) {
        let score =
          parseInt(match[2], 10) * (this.game.turn() === "w" ? 1 : -1);
        /// Is it measuring in centipawns?
        if (match[1] === "cp") {
          this.engineStatus.score = (score / 100.0).toFixed(2);
          /// Did it find a mate?
        } else if (match[1] === "mate") {
          this.engineStatus.score = "Mate in " + Math.abs(score);
        }

        /// Is the score bounded?
        if ((match = line.match(/\b(upper|lower)bound\b/))) {
          this.engineStatus.score =
            ((match[1] === "upper") === (this.game.turn() === "w")
              ? "<= "
              : ">= ") + this.engineStatus.score;
        }
        this.setState({ score: this.engineStatus.score });
      }
    }
    // displayStatus();
  }

  prepareMove() {
    // stopClock();/
    // this.setState({ fen: game.fen() });
    let turn = this.game.turn() === "w" ? "white" : "black";
    if (!this.game.game_over()) {
      // if (turn === playerColor) {
      if (turn !== this.playerColor) {
        // playerColor = playerColor === 'white' ? 'black' : 'white';
        this.uciCmd("position startpos moves" + this.getMoves());
        this.uciCmd(`go movetime 2000`);
        // const { depth, nodes } = this.time;
        // if (this.time.wtime) {
        //   this.uciCmd(
        //     `go movetime `
        //     `go ${depth} depth ${nodes} nodes 5000 movetime` +
        //       ` wtime ${this.time.wtime} btime ${this.time.btime}`
        //   );
        // } else {
        //   this.uciCmd(`go ${depth} depth ${nodes} nodes 5000 movetime`);
        // }
        // isEngineRunning = true;
      }
      if (
        this.game.history().length >= 2 &&
        !this.time.depth &&
        !this.time.nodes
      ) {
        //startClock();
      }
    }
  }
  getMoves() {
    let moves = "";
    let history = this.game.history({ verbose: true });

    for (let i = 0; i < history.length; ++i) {
      let move = history[i];
      moves +=
        " " + move.from + move.to + (move.promotion ? move.promotion : "");
    }

    return moves;
  }
}

interface EngineStatus {
  engineLoaded: boolean;
  engineReady: boolean;
  search: string;
  score: number | string;
}

interface ChessTime {
  wtime: number;
  btime: number;
  winc: number;
  binc: number;
  depth?: number;
  nodes?: number;
}

interface StockfishMessageWrapper {
  (): Promise<StockfishMessageWrapper>;
  print: (line: string) => void;
  addMessageListener: (listener: MessageListener) => void;
  removeMessageListener: (listener: MessageListener) => void;
  terminate: () => void;
  postMessage: (command: string) => void;
  postRun: () => void;
}
