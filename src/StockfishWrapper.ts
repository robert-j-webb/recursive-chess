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
  private setScore!: (state: Score) => void;
  private lastBestMove?: ChessMove;
  private bestMoveCount = 0;
  public currentColor!: string;

  async init(setScore: (state: Score) => void) {
    this.setScore = setScore;
    await window.Stockfish().then((sf) => {
      sf.addMessageListener((line) => this.onMessage(line));
      this.time = {
        wtime: 3000,
        btime: 3000,
        winc: 1500,
        binc: 1500,
        searchTime: 1000,
      };
      this.playerColor = "white";
      this.currentColor = "w";

      this.stockfishWrapper = sf;
      this.uciCmd("uci");
      this.uciCmd("ucinewgame");
      this.uciCmd("isready");
      this.engineStatus = {
        engineLoaded: true,
        score: { val: 0, type: ScoreType.Centipawns },
        engineReady: false,
        search: "",
        isCalculating: false,
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
        this.bestMoveCount++;
      } else if ((match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/))) {
        this.engineStatus.search = "Depth: " + match[1] + " Nps: " + match[2];
      }

      /// Is it sending feed back with a score?
      if ((match = line.match(/^info .*\bscore (-?\w+) (-?\d+)/))) {
        let score = parseInt(match[2], 10);
        /// Is it measuring in centipawns?
        if (match[1] === "cp") {
          this.engineStatus.score = {
            val: Math.round(score) / 100,
            type: ScoreType.Centipawns,
          };
          /// Did it find a mate?
        } else if (match[1] === "mate") {
          this.engineStatus.score = {
            val: Math.abs(score),
            type: ScoreType.Mate,
          };
        }

        // /// Is the score bounded?
        // if ((match = line.match(/\b(upper|lower)bound\b/))) {
        //   const isUpper = match[1] === "upper";
        //   this.engineStatus.score = {
        //     val: Math.round(score) / 100,
        //     type: isUpper ? ScoreType.Upperbound : ScoreType.Lowerbound,
        //   };
        // }
        this.setScore(this.engineStatus.score);
      }
    }
  }

  async getBestMove(history: Move[], searchMoves?: string): Promise<ChessMove> {
    if (this.engineStatus.isCalculating) {
      await pollUntil(() => !this.engineStatus.isCalculating);
    }
    this.engineStatus.isCalculating = true;
    this.uciCmd(`position startpos moves ${this.getMoves(history)}`);

    if (searchMoves) {
      this.uciCmd(
        `go movetime ${this.time.searchTime} searchmoves ${searchMoves}`
      );
    } else {
      this.uciCmd(`go movetime ${this.time.searchTime}`);
    }
    const prevBestMoveCount = this.bestMoveCount;
    await pollUntil(() => prevBestMoveCount < this.bestMoveCount);
    this.engineStatus.isCalculating = false;
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

  stopCalculations() {
    this.uciCmd("stop");
  }

  uciCmd(msg: string) {
    this.stockfishWrapper.postMessage(msg);
  }
}

async function pollUntil<T>(
  condition: () => T,
  timeout: number = 15000,
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

export interface Score {
  val: number;
  type: ScoreType;
}

export enum ScoreType {
  Centipawns,
  Lowerbound,
  Upperbound,
  Mate,
}

interface EngineStatus {
  engineLoaded: boolean;
  engineReady: boolean;
  search: string;
  score: Score;
  isCalculating: boolean;
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
