/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { motion } from "motion/react";
import { 
  RotateCcw, 
  History, 
  Trophy, 
  User,
  Cpu,
  Undo,
  Target
} from "lucide-react";
import { cn } from "./lib/utils";

// --- Types ---

import { getBestMove } from "./lib/chess-ai";

type GameStatus = "playing" | "checkmate" | "draw" | "stalemate" | "threefold" | "insufficient";
type Difficulty = "basico" | "medio" | "experto" | "asesino";
type ScreenState = "menu" | "game";

// --- Components ---

const Board = Chessboard as any;

const MoveHistory = ({ history }: { history: string[] }) => {
  const pairs = useMemo(() => {
    const p = [];
    for (let i = 0; i < history.length; i += 2) {
      p.push([history[i], history[i + 1]]);
    }
    return p;
  }, [history]);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] border-l border-[#333] w-80 overflow-hidden">
      <div className="p-4 border-b border-[#333] flex items-center gap-2 text-white/70">
        <History size={18} />
        <span className="font-mono text-xs uppercase tracking-widest">Historial</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-sm">
        {pairs.map((pair, idx) => (
          <div key={idx} className="grid grid-cols-[30px_1fr_1fr] gap-2 py-1.5 px-3 hover:bg-white/5 rounded transition-colors border-b border-white/5 last:border-0">
            <span className="text-white/20">{idx + 1}.</span>
            <span className="text-white/90 font-medium">{pair[0]}</span>
            <span className="text-white/90 font-medium">{pair[1] || ""}</span>
          </div>
        ))}
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-white/10 gap-4">
            <Target size={40} strokeWidth={1} />
            <span className="italic text-xs">Sin movimientos</span>
          </div>
        )}
      </div>
    </div>
  );
};

const StatusBanner = ({ status, winner }: { status: GameStatus; winner: string | null }) => {
  if (status === "playing") return null;

  const messages: Record<GameStatus, string> = {
    checkmate: `¡Jaque Mate! Ganador: ${winner === "w" ? "Blancas" : "Negras"}`,
    draw: "Tablas (Regla 50 mov.)",
    stalemate: "Tablas (Ahogado)",
    threefold: "Tablas (Repetición)",
    insufficient: "Tablas (Material Insuf.)",
    playing: ""
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 bg-[#F27D26] text-black px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(242,125,38,0.3)] flex items-center gap-4 font-black uppercase tracking-tighter"
    >
      <Trophy size={24} />
      <span className="text-xl">{messages[status]}</span>
    </motion.div>
  );
};

export default function App() {
  const [game, setGame] = useState(new Chess());
  const gameRef = useRef(game);
  
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const [moveFrom, setMoveFrom] = useState<Square | "">("");
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});
  const [lastMoveSquares, setLastMoveSquares] = useState<Record<string, any>>({});
  const [status, setStatus] = useState<GameStatus>("playing");
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
  const [screen, setScreen] = useState<ScreenState>("menu");
  const [menuView, setMenuView] = useState<"main" | "ai" | "internet">("main");

  // Actualizar estado del juego y limpiar resaltados si es necesario
  useEffect(() => {
    if (game.isCheckmate()) setStatus("checkmate");
    else if (game.isDraw()) setStatus("draw");
    else if (game.isStalemate()) setStatus("stalemate");
    else if (game.isThreefoldRepetition()) setStatus("threefold");
    else if (game.isInsufficientMaterial()) setStatus("insufficient");
    else setStatus("playing");
  }, [game]);

  // CPU Move
  useEffect(() => {
    if (game.turn() === 'b' && status === 'playing') {
      const timer = setTimeout(() => {
        const depths: Record<Difficulty, number> = {
          basico: 1,
          medio: 2,
          experto: 3,
          asesino: 4
        };
        
        const gameCopy = new Chess();
        gameCopy.loadPgn(game.pgn());
        
        const bestMove = getBestMove(gameCopy, depths[difficulty]);
        
        if (bestMove) {
          const move = gameCopy.move(bestMove);
          if (move) {
            setGame(gameCopy);
            setLastMoveSquares({
              [move.from]: { background: "rgba(242, 125, 38, 0.15)" },
              [move.to]: { background: "rgba(242, 125, 38, 0.15)" },
            });
          }
        }
      }, 100); // Reducido a 100ms para que empiece a calcular más rápido
      return () => clearTimeout(timer);
    }
  }, [game, status, difficulty]);

  // Obtener movimientos legales para resaltar
  const getMoveOptions = useCallback((square: Square) => {
    const moves = gameRef.current.moves({
      square,
      verbose: true,
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, any> = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          gameRef.current.get(move.to as Square)
            ? "radial-gradient(circle, rgba(242,125,38,0.5) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(242,125,38,0.5) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });
    newSquares[square] = {
      background: "rgba(242, 125, 38, 0.3)",
    };
    setOptionSquares(newSquares);
    return true;
  }, []);

  // Manejar soltar pieza (Drag & Drop)
  function onDrop(args: any) {
    console.log("onDrop args:", args);
    const { sourceSquare, targetSquare } = args;
    if (gameRef.current.turn() === 'b' || status !== 'playing' || !targetSquare) return false;

    const gameCopy = new Chess();
    gameCopy.loadPgn(gameRef.current.pgn());
    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // Siempre promociona a dama para simplificar
      });

      if (move === null) return false;

      setGame(gameCopy);
      setMoveFrom("");
      setOptionSquares({});
      setLastMoveSquares({
        [move.from]: { background: "rgba(242, 125, 38, 0.15)" },
        [move.to]: { background: "rgba(242, 125, 38, 0.15)" },
      });
      return true;
    } catch (e) {
      // Invalid move, ignore
      return false;
    }
  }

  // Manejar inicio de arrastre para resaltar movimientos
  function onPieceDragBegin(args: any) {
    console.log("onPieceDragBegin args:", args);
    const { square } = args;
    if (gameRef.current.turn() === 'b' || status !== 'playing' || !square) return;
    setMoveFrom(square as Square);
    getMoveOptions(square as Square);
  }

  // Manejar clic en casilla (Selección y Movimiento)
  function onSquareClick(args: any) {
    console.log("onSquareClick args:", args);
    const { square } = args;
    if (gameRef.current.turn() === 'b' || status !== 'playing') return;

    // Si no hay pieza seleccionada, intentar seleccionar
    if (!moveFrom) {
      const piece = gameRef.current.get(square as Square);
      if (piece && piece.color === 'w') {
        setMoveFrom(square as Square);
        getMoveOptions(square as Square);
      }
      return;
    }

    // Intentar mover desde la casilla seleccionada
    const gameCopy = new Chess();
    gameCopy.loadPgn(gameRef.current.pgn());
    try {
      const move = gameCopy.move({
        from: moveFrom,
        to: square,
        promotion: "q",
      });

      if (move) {
        setGame(gameCopy);
        setMoveFrom("");
        setOptionSquares({});
        setLastMoveSquares({
          [move.from]: { background: "rgba(242, 125, 38, 0.15)" },
          [move.to]: { background: "rgba(242, 125, 38, 0.15)" },
        });
      } else {
        // Si el movimiento fue inválido, intentar seleccionar nueva pieza si es blanca
        const piece = gameRef.current.get(square as Square);
        if (piece && piece.color === 'w') {
          setMoveFrom(square as Square);
          getMoveOptions(square as Square);
        } else {
          setMoveFrom("");
          setOptionSquares({});
        }
      }
    } catch (e) {
      // Invalid move, ignore
      const piece = gameRef.current.get(square as Square);
      if (piece && piece.color === 'w') {
        setMoveFrom(square as Square);
        getMoveOptions(square as Square);
      } else {
        setMoveFrom("");
        setOptionSquares({});
      }
    }
  }

  function resetGame() {
    setGame(new Chess());
    setStatus("playing");
    setMoveFrom("");
    setOptionSquares({});
    setLastMoveSquares({});
  }

  function undoMove() {
    const gameCopy = new Chess();
    gameCopy.loadPgn(gameRef.current.pgn());
    gameCopy.undo(); // Deshacer movimiento CPU
    gameCopy.undo(); // Deshacer movimiento Jugador
    setGame(gameCopy);
    setMoveFrom("");
    setOptionSquares({});
    setLastMoveSquares({});
  }

  const turn = game.turn() === "w" ? "Blancas" : "Negras";
  const isCheck = game.inCheck();

  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 font-sans selection:bg-[#F27D26] selection:text-black">
        <div className="max-w-md w-full flex flex-col items-center">
          <div className="mb-12 text-center">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50">
              AJEDREZ
            </h1>
            {menuView === "ai" && (
              <div className="text-[#F27D26] font-bold tracking-[0.2em] uppercase text-sm">
                Contra Inteligencia Artificial
              </div>
            )}
          </div>

          {menuView === "main" && (
            <div className="w-full flex flex-col gap-4">
              <button
                onClick={() => setMenuView("ai")}
                className="group relative w-full flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-[#F27D26] text-white hover:text-black py-6 rounded-2xl font-bold uppercase tracking-widest transition-all active:scale-95 border border-white/10 hover:border-[#F27D26]"
              >
                <span className="text-xl">IA vs Yo</span>
                <span className="text-[10px] opacity-70">Juega contra la computadora</span>
              </button>
              <button
                onClick={() => setMenuView("internet")}
                className="group relative w-full flex flex-col items-center justify-center gap-1 bg-white/5 hover:bg-[#F27D26] text-white hover:text-black py-6 rounded-2xl font-bold uppercase tracking-widest transition-all active:scale-95 border border-white/10 hover:border-[#F27D26]"
              >
                <span className="text-xl">Internet</span>
                <span className="text-[10px] opacity-70">Vía conexión con otros usuarios</span>
              </button>
            </div>
          )}

          {menuView === "ai" && (
            <div className="w-full flex flex-col gap-3">
              <div className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4 text-center">
                Selecciona tu nivel (IA)
              </div>
              {(["basico", "medio", "experto", "asesino"] as Difficulty[]).map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    setDifficulty(level);
                    setGame(new Chess());
                    setLastMoveSquares({});
                    setOptionSquares({});
                    setMoveFrom("");
                    setStatus("playing");
                    setScreen("game");
                    setMenuView("main");
                  }}
                  className="group relative w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-[#F27D26] text-white hover:text-black py-5 rounded-2xl font-bold uppercase tracking-widest transition-all active:scale-95 border border-white/10 hover:border-[#F27D26]"
                >
                  {level}
                </button>
              ))}
              <button
                onClick={() => setMenuView("main")}
                className="mt-4 text-white/50 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors"
              >
                Volver
              </button>
            </div>
          )}

          {menuView === "internet" && (
            <div className="w-full flex flex-col items-center gap-6 bg-white/5 p-8 rounded-2xl border border-white/10 text-center">
              <div className="text-[#F27D26]">
                <User size={48} />
              </div>
              <div>
                <h3 className="text-xl font-bold uppercase tracking-widest mb-2">Próximamente</h3>
                <p className="text-sm text-white/60">
                  El modo multijugador vía conexión con otros usuarios estará disponible en futuras actualizaciones.
                </p>
              </div>
              <button
                onClick={() => setMenuView("main")}
                className="mt-4 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs uppercase tracking-widest font-bold transition-colors"
              >
                Volver al menú
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex overflow-hidden font-sans selection:bg-[#F27D26] selection:text-black">
      {/* Área Principal */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-8">
        <StatusBanner status={status} winner={game.turn() === "w" ? "b" : "w"} />

        {/* Info Jugadores */}
        <div className="w-full max-w-[600px] flex justify-between items-center mb-8">
          <div className={cn(
            "flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 border border-transparent",
            game.turn() === 'b' ? "bg-white/5 scale-105 border-white/10 shadow-xl" : "opacity-30 grayscale"
          )}>
            <div className="w-12 h-12 rounded-full bg-black border border-white/20 flex items-center justify-center">
              <Cpu className="text-white/60" size={24} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Oponente</div>
              <div className="font-bold text-lg">Negras</div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
             <div className={cn(
               "px-4 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.2em] transition-all",
               isCheck ? "bg-red-500 text-white animate-pulse" : "bg-white/5 text-white/40"
             )}>
               {isCheck ? "¡JAQUE!" : "EN JUEGO"}
             </div>
             <div className="text-2xl font-black tracking-tighter italic uppercase text-[#F27D26]">
               {turn}
             </div>
          </div>

          <div className={cn(
            "flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 border border-transparent",
            game.turn() === 'w' ? "bg-white/5 scale-105 border-white/10 shadow-xl" : "opacity-30 grayscale"
          )}>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Tú</div>
              <div className="font-bold text-lg">Blancas</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-white border border-black/20 flex items-center justify-center">
              <User className="text-black/60" size={24} />
            </div>
          </div>
        </div>

        {/* El Tablero */}
        <div className="relative group">
          <div className="absolute -inset-8 bg-[#F27D26]/5 blur-[100px] rounded-full opacity-50" />
          <div className="w-[min(85vw,580px)] aspect-square shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden border border-white/10">
            <Board
              options={{
                position: game.fen(),
                onPieceDrop: onDrop,
                onPieceDrag: onPieceDragBegin,
                onSquareClick: onSquareClick,
                canDragPiece: ({ piece }) => piece.pieceType[0] === gameRef.current.turn() && status === 'playing',
                animationDurationInMs: 200,
                boardOrientation: "white",
                boardStyle: {
                  borderRadius: "8px",
                },
                darkSquareStyle: { backgroundColor: "#242424" },
                lightSquareStyle: { backgroundColor: "#d6d6d6" },
                squareStyles: { ...lastMoveSquares, ...optionSquares }
              }}
            />
          </div>
        </div>

        {/* Controles */}
        <div className="mt-12 flex flex-col items-center gap-6">
          {/* Selector de Dificultad */}
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            {(["basico", "medio", "experto", "asesino"] as Difficulty[]).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  difficulty === level 
                    ? "bg-[#F27D26] text-black shadow-lg" 
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setScreen("menu")}
              className="group flex items-center gap-3 bg-white/5 text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-tighter hover:bg-white/10 transition-all active:scale-95 border border-white/5"
            >
              Menú
            </button>
            <button 
              onClick={undoMove}
              disabled={game.history().length === 0 || status !== "playing"}
              className="group flex items-center gap-3 bg-white/5 text-white px-6 py-4 rounded-2xl font-bold uppercase tracking-tighter hover:bg-white/10 transition-all active:scale-95 disabled:opacity-10 disabled:pointer-events-none border border-white/5"
            >
              <Undo size={18} className="group-hover:-translate-x-1 transition-transform" />
              Deshacer
            </button>
            <button 
              onClick={resetGame}
              className="group flex items-center gap-3 bg-white text-black px-6 py-4 rounded-2xl font-bold uppercase tracking-tighter hover:bg-[#F27D26] hover:text-white transition-all active:scale-95 shadow-lg"
            >
              <RotateCcw size={18} className="group-hover:rotate-[-180deg] transition-transform duration-500" />
              Reiniciar
            </button>
          </div>
        </div>
      </main>

      {/* Sidebar */}
      <MoveHistory history={game.history()} />
    </div>
  );
}
