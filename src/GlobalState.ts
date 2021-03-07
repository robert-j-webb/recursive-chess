import { ChessInstance } from "chess.js";

interface JsonGame {
  id: string;
  pgn: string;
}

export class GameState {
  private readonly game: ChessInstance;
  readonly id: number;
  constructor(game: ChessInstance, id: number) {
    this.game = game;
    this.id = id;
  }

  sync(pgn: string) {
    this.game.load_pgn(pgn);
  }

  serialize(): JsonGame {
    return {
      pgn: this.game.pgn(),
      id: String(this.id),
    };
  }
}
const globalGames: GameState[] = [];

export function updateAllGameState(
  json: string,
  addGame: (pgn?: string, id?: number) => void
): boolean {
  const currentStates: JsonGame[] = JSON.parse(json);
  currentStates.forEach((onlineState) => {
    const onlineStateId = Number(onlineState.id);
    const matchingState = globalGames.find(
      (state) => onlineStateId === state.id
    );
    if (!matchingState) {
      addGame(onlineState.pgn, onlineStateId);
      return;
    }
    matchingState.sync(onlineState.pgn);

    if (gameId > onlineStateId) {
      gameId = onlineStateId;
    }
  });
  return true;
}

let gameId = 0;
export function getNextGameId() {
  return gameId++;
}

export function addGame(game: ChessInstance, id: number) {
  if (globalGames.some((gameState: GameState) => gameState.id === id)) {
    console.log(`game of id: ${id} already exists`);
    return;
  }
  globalGames.push(new GameState(game, id));
}

export function getAllGames() {
  return globalGames;
}
