import { useState, useEffect } from "react";
import { GameId, GameInfo } from "../types";
import { ArrowLeft, Volume2, VolumeX, RotateCcw, Play, Pause, MonitorCheck } from "lucide-react";
import Snake from "../games/Snake";
import BrickBreaker from "../games/BrickBreaker";
import FlappyBird from "../games/FlappyBird";
import SpaceShooter from "../games/SpaceShooter";
import { playSound, setGlobalMute, getGlobalMute } from "../utils/audio";

interface ArcadeConsoleProps {
  game: GameInfo;
  onExit: () => void;
  onUpdateHighScore: (gameId: GameId, score: number) => void;
  currentHighScore: number;
}

export default function ArcadeConsole({ game, onExit, onUpdateHighScore, currentHighScore }: ArcadeConsoleProps) {
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(getGlobalMute());
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [restartKey, setRestartKey] = useState(0);
  const [gameOverScore, setGameOverScore] = useState<number | null>(null);

  // Resume or start audio context when starting game
  useEffect(() => {
    // Unpause when entering a new game
    setIsPaused(false);
    setScore(0);
    setGameOverScore(null);
  }, [game.id]);



  // Safely synchronize current score with parent high scores
  useEffect(() => {
    if (score > currentHighScore) {
      onUpdateHighScore(game.id, score);
    }
  }, [score, currentHighScore, game.id, onUpdateHighScore]);

  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);
  };

  const handleGameOver = (finalScore: number) => {
    setGameOverScore(finalScore);
    playSound("gameover");
  };

  const handleRestart = () => {
    setScore(0);
    setGameOverScore(null);
    setIsPaused(false);
    setRestartKey((prev) => prev + 1);
    playSound("hit");
  };

  const handleMuteToggle = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    setGlobalMute(nextMute);
    if (!nextMute) {
      playSound("score");
    }
  };

  const handlePauseToggle = () => {
    setIsPaused((prev) => !prev);
    playSound("hit");
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 mt-2 mb-8 animate-[fadeIn_0.2s_ease-out]" id="arcade-cabinet-view">
      {/* Top Console Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-zinc-800 mb-6" id="console-action-bar">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors duration-200 text-sm font-medium font-mono"
          id="btn-quit-hub"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Hub</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Mute toggle */}
          <button
            onClick={handleMuteToggle}
            className={`p-2 rounded-lg border text-sm font-mono flex items-center justify-center transition-all ${
              isMuted
                ? "bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-950/40"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
            id="btn-mute-toggle"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* CRT toggle */}
          <button
            onClick={() => setCrtEnabled(!crtEnabled)}
            className={`p-2 rounded-lg border text-sm font-mono flex items-center justify-center transition-all ${
              crtEnabled
                ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-400 hover:bg-indigo-950/60"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
            title="Toggle Scanline CRT Filter Style"
            id="btn-crt-toggle"
          >
            <MonitorCheck className="w-4 h-4" />
            <span className="text-xs ml-1 hidden sm:inline">CRT FILTER</span>
          </button>

          {/* Pause Toggle */}
          {gameOverScore === null && (
            <button
              onClick={handlePauseToggle}
              className={`p-2 rounded-lg border text-sm font-mono flex items-center justify-center transition-all ${
                isPaused
                  ? "bg-yellow-950/20 border-yellow-500/30 text-yellow-400"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
              id="btn-pause-toggle"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span className="text-xs ml-1 hidden sm:inline">{isPaused ? "RESUME" : "PAUSE"}</span>
            </button>
          )}

          {/* Quick Restart */}
          <button
            onClick={handleRestart}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-mono text-xs flex items-center gap-1"
            id="btn-quick-restart"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">RESTART</span>
          </button>
        </div>
      </div>

      {/* Main Arcade Cabinet Framework */}
      <div className={`relative border-8 border-zinc-800 bg-zinc-950 rounded-2xl shadow-2xl p-4 md:p-6 overflow-hidden max-w-full`} id="cabinet-housing">
        {/* Neon Cabin Header Accent */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 opacity-80 ${
          game.id === 'snake' ? 'bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.5)]' :
          game.id === 'brick_breaker' ? 'bg-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.5)]' :
          game.id === 'flappy' ? 'bg-yellow-500 shadow-[0_4px_12px_rgba(234,179,8,0.5)]' :
          'bg-cyan-500 shadow-[0_4px_12px_rgba(6,182,212,0.5)]'
        }`} />

        {/* Dashboard scoreboard detail */}
        <div className="flex justify-between items-center mb-4 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60 font-mono" id="cabinet-scoreboard">
          <div>
            <span className="text-xs text-zinc-500 block uppercase tracking-wider">GAMEPLAY</span>
            <span className="text-lg font-bold text-white tracking-wide">{game.title}</span>
          </div>

          <div className="flex gap-6 sm:gap-10">
            <div>
              <span className="text-xs text-zinc-500 block uppercase tracking-wider">SCORE</span>
              <span className="text-xl font-bold font-mono text-zinc-200">{score}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block uppercase tracking-wider">HIGH SCORE</span>
              <span className="text-xl font-bold font-mono text-indigo-400">{currentHighScore}</span>
            </div>
          </div>
        </div>

        {/* Gameplay Stage */}
        <div className="relative flex justify-center w-full overflow-hidden" id="canvas-stage-wrapper">
          {/* Active game execution */}
          {game.id === "snake" && (
            <Snake
              onScore={handleScoreUpdate}
              onGameOver={handleGameOver}
              isPaused={isPaused}
              restartKey={restartKey}
            />
          )}
          {game.id === "brick_breaker" && (
            <BrickBreaker
              onScore={handleScoreUpdate}
              onGameOver={handleGameOver}
              isPaused={isPaused}
              restartKey={restartKey}
            />
          )}
          {game.id === "flappy" && (
            <FlappyBird
              onScore={handleScoreUpdate}
              onGameOver={handleGameOver}
              isPaused={isPaused}
              restartKey={restartKey}
            />
          )}
          {game.id === "space_shooter" && (
            <SpaceShooter
              onScore={handleScoreUpdate}
              onGameOver={handleGameOver}
              isPaused={isPaused}
              restartKey={restartKey}
            />
          )}


          {/* Dynamic CRT Scanlines overlay effect */}
          {crtEnabled && (
            <div
              className="absolute inset-0 pointer-events-none z-10 crt-overlay mix-blend-overlay opacity-[0.24]"
              style={{
                background:
                  "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.05), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.05))",
                backgroundSize: "100% 4px, 5px 100%",
              }}
              id="crt-pixel-raster-layer"
            />
          )}
        </div>

        {/* Console footer metadata / controls guidance */}
        <div className="mt-5 pt-4 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="console-info-row">
          <div>
            <h4 className="text-xs text-zinc-500 font-mono uppercase tracking-widest mb-1.5">CONTROLS INSTRUCTIONS:</h4>
            <div className="flex flex-wrap gap-2">
              {game.controls.map((ctrl, index) => (
                <div key={index} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800/80 px-2 py-1 rounded text-xs text-zinc-300 font-mono">
                  {ctrl.keys.map((k, kIdx) => (
                    <kbd key={kIdx} className="bg-zinc-800 border border-zinc-700 px-1 py-0.5 rounded text-[10px] text-white font-bold leading-none shadow shadow-black">
                      {k}
                    </kbd>
                  ))}
                  <span className="text-[11px] text-zinc-400">{ctrl.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-600 font-mono block">ARCADE PROTOCOL</span>
            <span className="text-[11px] text-zinc-400 font-mono uppercase">{game.category} SIMULATOR v1.02</span>
          </div>
        </div>
      </div>
    </div>
  );
}
