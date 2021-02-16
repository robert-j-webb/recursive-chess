import React from "react";
import { ScoreType, Score } from "./StockfishWrapper";

function ScoreDisplay(props: { score: Score }) {
  const { score } = props;

  return <p>{getScoreString(score)}</p>;
}

function getScoreString(score: Score) {
  switch (score.type) {
    case ScoreType.Centipawns:
      return `Centipawns: ${score.val}`;
    case ScoreType.Upperbound:
      return `Upperbound: ${score.val}`;
    case ScoreType.Lowerbound:
      return `Lowerbound: ${score.val}`;
    case ScoreType.Mate:
      return `Mate in: ${score.val}`;
  }
}

export function diffScores(
  actualMove: Score,
  prevMove: Score,
  bestMove: Score,
  playerType: string
): string {
  // Player type is stale
  const isWhite = playerType !== "w";

  const differenceFromBest = scoreCompare(actualMove, bestMove);
  // Did you match (or beat) the best move's score?
  if (isScoreEqual(actualMove, bestMove) || differenceFromBest > 0) {
    return `You made the best move!`;
  }

  // The difference in quality between prev and actual is to flip the sign of the previous move and compare.
  const differenceFromPrevious = scoreCompare(actualMove, prevMove, true);
  // Did your move make the position much worse? The previous move will be better
  // which means you either are struggling or blundered.
  if (differenceFromPrevious < 0) {
    return `You have fucked up by this much: ${differenceFromPrevious}`;
  }

  if (
    actualMove.type === ScoreType.Centipawns &&
    prevMove.type === ScoreType.Centipawns &&
    bestMove.type === ScoreType.Centipawns
  ) {
    const diff = Math.round(100 * (actualMove.val - prevMove.val)) / 100;
    const isImprovement = isWhite
      ? actualMove.val > prevMove.val
      : actualMove.val < prevMove.val;
    return (
      `Your best move had a score of ${bestMove.val}. ` +
      `You chose a move with a score of ${actualMove.val} which is an ${
        isImprovement ? "improvement" : "degrade"
      }` +
      ` of ${Math.abs(diff)} from previous: ${prevMove.val}`
    );
  }
  if (bestMove.type === ScoreType.Mate) {
    return `You just blundered mate in ${bestMove.val}`;
  }
  if (actualMove.type === ScoreType.Mate) {
    return `You lost a force mate sequence. Score is now: ${getScoreString(
      bestMove
    )}`;
  }
  // Coerce to bestMove type
  return getScoreString({
    val: actualMove.val - bestMove.val,
    type: bestMove.type,
  });
}

// Stockfish will inconsistenly calculate moves so we have some fudging here.
const SCORE_EPSILON = 0.03;

// Returns the difference between a and b
function scoreCompare(a: Score, b: Score, flipB = false) {
  if (a.type === b.type) {
    return a.val - (flipB ? b.val * -1 : b.val);
  }
  // We were in a mating sequence, and now we are not.
  return a.type === ScoreType.Mate ? 1 : -1;
}

function isScoreEqual(a: Score, b: Score) {
  return Math.abs(a.val - b.val) <= SCORE_EPSILON;
}

export default ScoreDisplay;
