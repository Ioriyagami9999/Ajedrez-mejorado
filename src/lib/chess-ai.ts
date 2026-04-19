import { Chess, Move } from "chess.js";

const pieceValues: Record<string, number> = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 900,
};

// Tablas de posición simplificadas para darle algo de sentido posicional a la IA
const pawnEvalWhite = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5,  5,  5,  5,  5,  5,  5,  5],
  [1,  1,  2,  3,  3,  2,  1,  1],
  [0.5,  0.5,  1,  2.5,  2.5,  1,  0.5,  0.5],
  [0,  0,  0,  2,  2,  0,  0,  0],
  [0.5, -0.5, -1,  0,  0, -1, -0.5,  0.5],
  [0.5,  1, 1,  -2, -2,  1,  1,  0.5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const pawnEvalBlack = pawnEvalWhite.slice().reverse();

const knightEval = [
  [-5, -4, -3, -3, -3, -3, -4, -5],
  [-4, -2,  0,  0,  0,  0, -2, -4],
  [-3,  0,  1,  1.5,  1.5,  1,  0, -3],
  [-3,  0.5,  1.5,  2,  2,  1.5,  0.5, -3],
  [-3,  0,  1.5,  2,  2,  1.5,  0, -3],
  [-3,  0.5,  1,  1.5,  1.5,  1,  0.5, -3],
  [-4, -2,  0,  0.5,  0.5,  0, -2, -4],
  [-5, -4, -3, -3, -3, -3, -4, -5]
];

const bishopEvalWhite = [
  [ -2, -1, -1, -1, -1, -1, -1, -2],
  [ -1,  0,  0,  0,  0,  0,  0, -1],
  [ -1,  0,  0.5,  1,  1,  0.5,  0, -1],
  [ -1,  0.5,  0.5,  1,  1,  0.5,  0.5, -1],
  [ -1,  0,  1,  1,  1,  1,  0, -1],
  [ -1,  1,  1,  1,  1,  1,  1, -1],
  [ -1,  0.5,  0,  0,  0,  0,  0.5, -1],
  [ -2, -1, -1, -1, -1, -1, -1, -2]
];

const bishopEvalBlack = bishopEvalWhite.slice().reverse();

const rookEvalWhite = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [  0.5,  1,  1,  1,  1,  1,  1,  0.5],
  [ -0.5,  0,  0,  0,  0,  0,  0, -0.5],
  [ -0.5,  0,  0,  0,  0,  0,  0, -0.5],
  [ -0.5,  0,  0,  0,  0,  0,  0, -0.5],
  [ -0.5,  0,  0,  0,  0,  0,  0, -0.5],
  [ -0.5,  0,  0,  0,  0,  0,  0, -0.5],
  [  0,   0,  0,  0.5,  0.5,  0,  0,  0]
];

const rookEvalBlack = rookEvalWhite.slice().reverse();

const evalQueen = [
  [ -2, -1, -1, -0.5, -0.5, -1, -1, -2],
  [ -1,  0,  0,  0,  0,  0,  0, -1],
  [ -1,  0,  0.5,  0.5,  0.5,  0.5,  0, -1],
  [ -0.5,  0,  0.5,  0.5,  0.5,  0.5,  0, -0.5],
  [  0,  0,  0.5,  0.5,  0.5,  0.5,  0, -0.5],
  [ -1,  0.5,  0.5,  0.5,  0.5,  0.5,  0, -1],
  [ -1,  0,  0.5,  0,  0,  0,  0, -1],
  [ -2, -1, -1, -0.5, -0.5, -1, -1, -2]
];

const kingEvalWhite = [
  [ -3, -4, -4, -5, -5, -4, -4, -3],
  [ -3, -4, -4, -5, -5, -4, -4, -3],
  [ -3, -4, -4, -5, -5, -4, -4, -3],
  [ -3, -4, -4, -5, -5, -4, -4, -3],
  [ -2, -3, -3, -4, -4, -3, -3, -2],
  [ -1, -2, -2, -2, -2, -2, -2, -1],
  [  2,  2,  0,  0,  0,  0,  2,  2 ],
  [  2,  3,  1,  0,  0,  1,  3,  2 ]
];

const kingEvalBlack = kingEvalWhite.slice().reverse();

function getPieceValue(piece: { type: string; color: string }, x: number, y: number): number {
  if (piece === null) return 0;
  
  let val = pieceValues[piece.type] || 0;
  
  // Positional value
  switch (piece.type) {
    case 'p': val += (piece.color === 'w' ? pawnEvalWhite[y][x] : pawnEvalBlack[y][x]); break;
    case 'n': val += knightEval[y][x]; break;
    case 'b': val += (piece.color === 'w' ? bishopEvalWhite[y][x] : bishopEvalBlack[y][x]); break;
    case 'r': val += (piece.color === 'w' ? rookEvalWhite[y][x] : rookEvalBlack[y][x]); break;
    case 'q': val += evalQueen[y][x]; break;
    case 'k': val += (piece.color === 'w' ? kingEvalWhite[y][x] : kingEvalBlack[y][x]); break;
  }
  
  return piece.color === 'w' ? val : -val;
}

function evaluateBoard(game: Chess): number {
  let totalEvaluation = 0;
  const board = game.board();
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        totalEvaluation += getPieceValue(piece, j, i);
      }
    }
  }
  return totalEvaluation;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, isMaximizingPlayer: boolean): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = game.moves();

  if (isMaximizingPlayer) {
    let bestVal = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      bestVal = Math.max(bestVal, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
      game.undo();
      alpha = Math.max(alpha, bestVal);
      if (beta <= alpha) {
        break;
      }
    }
    return bestVal;
  } else {
    let bestVal = Infinity;
    for (let i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      bestVal = Math.min(bestVal, minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer));
      game.undo();
      beta = Math.min(beta, bestVal);
      if (beta <= alpha) {
        break;
      }
    }
    return bestVal;
  }
}

export function getBestMove(game: Chess, depth: number): string | null {
  const moves = game.moves();
  if (moves.length === 0) return null;
  
  // Si la profundidad es 0 o 1 (Básico), hacemos algo rápido o semi-aleatorio
  if (depth <= 1) {
      // Nivel básico: mueve aleatorio o captura si puede
      const captures = moves.filter(m => m.includes('x'));
      if (captures.length > 0 && Math.random() > 0.5) {
          return captures[Math.floor(Math.random() * captures.length)];
      }
      return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMove = null;
  let bestValue = game.turn() === 'w' ? -Infinity : Infinity;

  // Ordenar movimientos para mejorar alpha-beta pruning (capturas primero)
  moves.sort((a, b) => {
      const aCapture = a.includes('x') ? 1 : 0;
      const bCapture = b.includes('x') ? 1 : 0;
      return bCapture - aCapture;
  });

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    game.move(move);
    
    // El oponente de quien acaba de mover
    const boardValue = minimax(game, depth - 1, -Infinity, Infinity, game.turn() === 'w');
    game.undo();

    if (game.turn() === 'w') {
      if (boardValue > bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    } else {
      if (boardValue < bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    }
  }

  return bestMove || moves[Math.floor(Math.random() * moves.length)];
}
