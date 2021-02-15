import { Move } from "chess.js";
import clone from "underscore/modules/clone";
import isEqual from "underscore/modules/isEqual";

declare global {
  interface Window {
    Stockfish: StockfishMessageWrapper;
  }
}

type MessageListener = (line: string) => unknown | void;

export class StockfishWrapper {
  private stockfishWrapper!: StockfishMessageWrapper;
  private engineStatus!: EngineStatus;
  private time!: ChessTime;
  private playerColor!: "white" | "black";
  private setScore!: (state: string) => void;
  private lastBestMove?: ChessMove;
  public currentColor!: string;

  async init(setScore: (state: string) => void) {
    this.setScore = setScore;
    await window.Stockfish().then((sf) => {
      sf.addMessageListener((line) => this.onMessage(line));
      this.time = {
        wtime: 3000,
        btime: 3000,
        winc: 1500,
        binc: 1500,
        searchTime: 2000,
      };
      this.playerColor = "white";
      this.currentColor = "w";

      this.stockfishWrapper = sf;
      this.uciCmd("uci");
      this.uciCmd("ucinewgame");
      this.uciCmd("isready");
      this.engineStatus = {
        engineLoaded: true,
        score: "0",
        engineReady: false,
        search: "",
      };
    });
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
        this.lastBestMove = [match[1], match[2]];
      } else if ((match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/))) {
        this.engineStatus.search = "Depth: " + match[1] + " Nps: " + match[2];
      }

      /// Is it sending feed back with a score?
      if ((match = line.match(/^info .*\bscore (\w+) (-?\d+)/))) {
        let score =
          parseInt(match[2], 10) * (this.currentColor === "w" ? 1 : -1);
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
            ((match[1] === "upper") === (this.currentColor === "w")
              ? "<= "
              : ">= ") + this.engineStatus.score;
        }
        this.setScore(this.engineStatus.score);
      }
    }
  }

  async getBestMove(history: Move[]): Promise<ChessMove> {
    this.uciCmd("position startpos moves" + this.getMoves(history));
    this.uciCmd(`go movetime ${this.time.searchTime}`);
    const startTime = new Date();
    const prevLastMove = clone(this.lastBestMove);
    await pollUntil(() => !isEqual(this.lastBestMove, prevLastMove));
    const endTime = new Date();
    console.log(
      `${(endTime.getTime() - startTime.getTime()) / 1000}s of searching`
    );
    return this.lastBestMove!;
  }

  getMoves(history: Move[]) {
    let moves = "";

    for (let i = 0; i < history.length; ++i) {
      let move = history[i];
      moves +=
        " " + move.from + move.to + (move.promotion ? move.promotion : "");
    }

    return moves;
  }

  uciCmd(msg: string) {
    this.stockfishWrapper.postMessage(msg);
  }
}

async function pollUntil<T>(
  condition: () => T,
  timeout: number = 5000,
  interval: number = 50
): Promise<T> {
  const timeoutPoll = setTimeout(() => {
    throw new Error(`Waited for ${timeout}ms with no result.`);
  }, timeout);
  let result: T;
  while (!(result = condition())) {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), interval));
  }
  clearTimeout(timeoutPoll);
  return result;
}

type ChessMove = string[];

interface EngineStatus {
  engineLoaded: boolean;
  engineReady: boolean;
  search: string;
  score: string;
}

interface ChessTime {
  wtime: number;
  btime: number;
  winc: number;
  binc: number;
  depth?: number;
  nodes?: number;
  searchTime: number;
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
