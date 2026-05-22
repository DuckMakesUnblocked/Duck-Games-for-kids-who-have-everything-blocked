import React, { useState, useEffect } from "react";
import {
  Gamepad2,
  Gamepad,
  Rocket,
  Trophy,
  Search,
  Sparkles,
  Clock,
  Grid3X3,
  Flame,
  Volume2,
  VolumeX,
  Play
} from "lucide-react";
import { GameId, GameInfo, PlayerStats } from "./types";
import ArcadeConsole from "./components/ArcadeConsole";
import { playSound, setGlobalMute, getGlobalMute } from "./utils/audio";

const IconMap: Record<string, any> = {
  Rocket: Rocket,
  Grid3X3: Grid3X3,
  Gamepad2: Gamepad2,
  Sparkles: Sparkles,
  Gamepad: Gamepad
};

const AVAILABLE_GAMES: GameInfo[] = [
  {
    id: "space_shooter",
    title: "Asteroids",
    description: "Defend galactic borders from invading alien waves. Avoid descending missiles and defeat hostile flagships!",
    instructions: "Move left or right with arrow keys or A/D, hold spacebar down to fire continuous laser projectiles.",
    controls: [
      { keys: ["◀", "▶", "A", "D"], description: "Fly Ship Left/Right" },
      { keys: ["Spacebar"], description: "Continuous Laser Guns" }
    ],
    category: "Action",
    icon: "Rocket",
    accentColor: "border-cyan-500/40 hover:border-cyan-500/80 shadow-cyan-500/5 hover:shadow-cyan-500/20",
    bgColor: "bg-cyan-950",
    highScoreKey: "highscore_space_shooter"
  },
  {
    id: "brick_breaker",
    title: "Breakout Game",
    description: "Bounce quantum energy balls to crumble rows of vibrant retro block matrices, setting sweet score streaks!",
    instructions: "Move paddle with mouse movement, drag control on screens, or standard arrow keys.",
    controls: [
      { keys: ["◀", "▶", "A", "D"], description: "Move Paddle Left/Right" },
      { keys: ["Mouse / Drag"], description: "Immediate Pointer Sync" }
    ],
    category: "Arcade",
    icon: "Grid3X3",
    accentColor: "border-blue-500/40 hover:border-blue-500/80 shadow-blue-500/5 hover:shadow-blue-500/20",
    bgColor: "bg-blue-950",
    highScoreKey: "highscore_brick_breaker"
  },
  {
    id: "snake",
    title: "Snake",
    description: "Crawl through pixel grid blocks to consume bright cyber cherries and golden apples. Multiply your lengths recursively!",
    instructions: "Steer snake direction using standard arrow keys or WASD controls. Avoid hitting borders or your own body segments.",
    controls: [
      { keys: ["▲", "▼", "◀", "▶"], description: "Steer Snake" },
      { keys: ["W", "A", "S", "D"], description: "Alternate Controls" }
    ],
    category: "Classic",
    icon: "Gamepad2",
    accentColor: "border-emerald-500/40 hover:border-emerald-500/80 shadow-emerald-500/5 hover:shadow-emerald-500/20",
    bgColor: "bg-emerald-950",
    highScoreKey: "highscore_snake"
  },
  {
    id: "flappy",
    title: "Flappy Bird",
    description: "Keep momentum fluid. Propel a tiny flight model through incoming green sewer blocks without crashing down.",
    instructions: "Left click anywhere on game frame, or smash Spacebar to triggers temporary upwards air lifts.",
    controls: [
      { keys: ["Spacebar"], description: "Pulse Upward Lift" },
      { keys: ["Left-Click / Tap"], description: "Simulated Wing Flap" }
    ],
    category: "Puzzle",
    icon: "Sparkles",
    accentColor: "border-yellow-500/40 hover:border-yellow-500/80 shadow-yellow-500/5 hover:shadow-yellow-500/20",
    bgColor: "bg-yellow-950",
    highScoreKey: "highscore_flappy"
  }
];

export default function App() {
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [highScores, setHighScores] = useState<Record<string, number>>({
    snake: 0,
    brick_breaker: 0,
    flappy: 0,
    space_shooter: 0
  });
  const [isAudioMuted, setIsAudioMuted] = useState(getGlobalMute());

  // Load high scores from localStorage on mount
  useEffect(() => {
    const scores: Record<string, number> = {
      snake: 0,
      brick_breaker: 0,
      flappy: 0,
      space_shooter: 0
    };

    AVAILABLE_GAMES.forEach((g) => {
      const stored = localStorage.getItem(g.highScoreKey);
      if (stored) {
        scores[g.id] = parseInt(stored, 10) || 0;
      } else {
        scores[g.id] = 0;
      }
    });

    setHighScores(scores);
  }, []);

  const handleUpdateHighScore = (gameId: GameId, score: number) => {
    const game = AVAILABLE_GAMES.find((g) => g.id === gameId);
    if (game) {
      localStorage.setItem(game.highScoreKey, score.toString());
      setHighScores((prev) => ({
        ...prev,
        [gameId]: score
      }));
    }
  };

  const handleResetScores = () => {
    if (window.confirm("Are you sure you want to restore high scores back to 0?")) {
      AVAILABLE_GAMES.forEach((g) => {
        localStorage.removeItem(g.highScoreKey);
      });
      setHighScores({
        snake: 0,
        brick_breaker: 0,
        flappy: 0,
        space_shooter: 0
      });
      playSound("hit");
    }
  };

  const handleMuteToggle = () => {
    const newMute = !isAudioMuted;
    setIsAudioMuted(newMute);
    setGlobalMute(newMute);
    if (!newMute) {
      playSound("score");
    }
  };

  const handleSelectGame = (game: GameInfo) => {
    setSelectedGame(game);
    // Auto-resume Audio Context gently
    playSound("hit");
  };



  // Filter list based on search and selected tags
  const filteredGames = AVAILABLE_GAMES.filter((g) => {
    const matchesSearch =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "All" || g.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = ["All", "Action", "Arcade", "Classic", "Puzzle"];

  // Total accumulative high score sum
  const totalScoreSum = (Object.values(highScores) as number[]).reduce((a, b) => a + b, 0);

  // Recommendation generator based on lowest score (game they might want to practice!)
  const recommendedGame =
    [...AVAILABLE_GAMES].sort((a, b) => (highScores[a.id] || 0) - (highScores[b.id] || 0))[0] ||
    AVAILABLE_GAMES[0];

  return (
    <div className="min-h-screen bg-[#070507] text-zinc-100 font-sans antialiased selection:bg-indigo-500 selection:text-white" id="main-unblocked-wrapper">
      
      {/* Visual background lights style grids */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-10 w-96 h-96 bg-purple-950/10 rounded-full filter blur-[100px] pointer-events-none" />
      
      {/* Top Header Navigation bar */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40" id="global-header">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedGame(null)} id="brand-identity">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/20 flex items-center justify-center">
              <Gamepad className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight font-sans text-white uppercase flex items-center gap-2">
                Unblocked Games <span className="text-[10px] py-0.5 px-1.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900">SECURE Hub</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono">100% Client-Side Retro Simulator</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Quick Volume Indicator */}
            <button
              onClick={handleMuteToggle}
              className={`p-2 rounded-lg border text-sm flex items-center gap-1.5 transition-colors ${
                isAudioMuted
                  ? "bg-red-950/30 border-red-900/40 text-red-400"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
              title={isAudioMuted ? "Unmute Sounds" : "Mute Sounds"}
              id="top-mute-shortcut"
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="text-xs font-mono hidden sm:inline">{isAudioMuted ? "SOUNDS OFF" : "SOUNDS ON"}</span>
            </button>
            
            {/* Visual Capsule Flag */}
            <div className="hidden md:flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono" id="network-security-pill">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-[pulse_1.5s_infinite]" />
              <span className="text-zinc-400 text-[10px]">SCHOOL NET OK</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 relative z-10" id="main-content-layout">
        
        {selectedGame ? (
          /* IMMSERSIVE ARCADE CABINET SHELL */
          <div className="space-y-4" id="active-game-viewport-container">
            <ArcadeConsole
              game={selectedGame}
              onExit={() => {
                setSelectedGame(null);
                playSound("hit");
              }}
              onUpdateHighScore={handleUpdateHighScore}
              currentHighScore={highScores[selectedGame.id]}
            />
          </div>
        ) : (
          /* RETRO DASHBOARD / GAMES DIRECTORY */
          <div className="space-y-8" id="games-portal-dashboard">
            
            {/* Dynamic Interactive Bento Metrics Card */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5" id="bento-statistics-section">
              <div className="bg-zinc-900/40 border border-zinc-900/80 p-5 rounded-2xl flex items-center justify-between hover:border-zinc-800/80 transition-all shadow-sm" id="stat-card-total">
                <div className="space-y-1">
                  <span className="text-zinc-500 text-xs uppercase tracking-wider block font-mono">My High Score Sum</span>
                  <div className="text-3xl font-extrabold tracking-tight text-white">{totalScoreSum}</div>
                  <p className="text-[10px] text-zinc-400 font-mono">Combined gaming record scores</p>
                </div>
                <div className="bg-indigo-950/60 border border-indigo-900/50 p-3.5 rounded-2xl text-indigo-400 shadow-md">
                  <Trophy className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-900/80 p-5 rounded-2xl relative overflow-hidden group hover:border-zinc-800/80 transition-all shadow-sm" id="stat-card-recommender">
                {/* Accent glow lights background */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-yellow-500/5 rounded-full filter blur-2xl group-hover:bg-yellow-500/10 transition-all pointer-events-none" />
                <div className="space-y-1 flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-zinc-500 text-xs uppercase tracking-wider block font-mono flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-500" /> Recommended Practice
                    </span>
                    <div className="text-lg font-bold text-zinc-200 group-hover:text-yellow-400 transition-colors">{recommendedGame.title}</div>
                    <p className="text-[11px] text-zinc-400">Current High Record: <b className="font-mono text-zinc-300">{highScores[recommendedGame.id]}</b></p>
                  </div>
                  <button
                    onClick={() => handleSelectGame(recommendedGame)}
                    className="mt-1 bg-yellow-500 hover:bg-yellow-400 text-yellow-950 p-2.5 rounded-xl transition-all font-bold flex items-center justify-center shadow-lg shadow-yellow-500/10 cursor-pointer"
                    title="Launch recommended game"
                    id="btn-quick-play-recommender"
                  >
                    <Play className="w-4 h-4 fill-yellow-950" />
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-900/80 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-800/80 transition-all shadow-sm" id="stat-card-utility">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider block font-mono">Local Data Save</span>
                    <span className="text-xs text-emerald-400 font-mono block mt-1">● AUTOSAVING ON BROWSER</span>
                  </div>
                </div>
                <div className="flex gap-2.5 mt-2">
                  <button
                    onClick={handleResetScores}
                    className="text-[10px] font-mono text-zinc-500 hover:text-red-400 hover:underline transition-all uppercase"
                    id="btn-trigger-reset-stats"
                  >
                    Reset Score History
                  </button>
                </div>
              </div>
            </section>

            {/* Catalog filter selection & Search dashboard */}
            <section className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 md:p-6 space-y-4 shadow-sm" id="catalog-controls-container">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between" id="filter-wrapper-controls">
                
                {/* Interactive category buttons */}
                <div className="flex flex-wrap gap-1.5 w-full md:w-auto" id="category-selector-pills">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        playSound("hit");
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                        selectedCategory === cat
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-850"
                      }`}
                      id={`btn-cat-${cat.toLowerCase()}`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}


                </div>

                {/* Keyboard search query input details */}
                <div className="relative w-full md:w-80" id="search-input-housing">
                  <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-zinc-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search arcade games catalog..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono"
                    id="input-game-search"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs font-mono"
                      id="btn-search-clear"
                    >
                      CLEAR
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Custom Grid of available retro games */}
            <section className="space-y-4" id="games-grid-canvas-directory">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs uppercase font-mono tracking-widest text-zinc-500">
                  Games Directory ({filteredGames.length})
                </h3>
              </div>

              {filteredGames.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="games-grid-inner">
                  {filteredGames.map((game) => {
                    const TargetIcon = IconMap[game.icon] || Gamepad;
                    const bBestScore = highScores[game.id] || 0;

                    return (
                      <div
                        key={game.id}
                        onClick={() => handleSelectGame(game)}
                        className={`group border rounded-2xl p-5 bg-zinc-950/60 backdrop-blur-sm cursor-pointer hover:bg-zinc-950 flex flex-col justify-between gap-6 transition-all duration-300 relative ${game.accentColor}`}
                        id={`game-item-${game.id}`}
                      >
                        {/* Light flare overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/100 opacity-0 group-hover:opacity-[0.02] transition-opacity duration-300 rounded-2xl pointer-events-none" />

                        {/* Card body content layout */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl text-zinc-200 group-hover:scale-110 group-hover:text-white transition-all duration-300">
                              <TargetIcon className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono uppercase bg-zinc-900 text-zinc-400 px-2 py-1 rounded-lg border border-zinc-850">
                                {game.category}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-base font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                              {game.title}
                            </h4>
                            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                              {game.description}
                            </p>
                          </div>
                        </div>

                        {/* Card footer details scoreboard updates */}
                        <div className="flex items-center justify-between border-t border-zinc-900 pt-3.5 mt-1">
                          <div className="flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                            <span className="text-[11px] text-zinc-500 font-mono uppercase">
                              Record Score:
                            </span>
                            <span className="text-xs font-bold font-mono text-zinc-200">{bBestScore}</span>
                          </div>

                          <span className="text-xs font-bold font-mono text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            LAUNCH CABINET ⚙️
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-zinc-900 flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-zinc-950/30 text-center" id="game-search-fallback-empty">
                  <p className="text-zinc-500 text-sm font-mono uppercase mb-1">No unblocked games match your query</p>
                  <p className="text-xs text-zinc-600">Try choosing a different category or clearing selectors</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("All");
                    }}
                    className="mt-4 px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-350 hover:text-white text-xs font-mono rounded-xl transition-all"
                    id="btn-reset-filters"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Standard simple footer details */}
      <footer className="border-t border-zinc-900 py-10 mt-16 text-center text-[11px] text-zinc-600 relative z-10 font-mono" id="applet-footer">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p>UNBLOCKED RETRO GAMES NETWORK • CLIENT EXECUTED SIMULATION</p>
          <p>NO BACKGROUND COOKIES OR NET ADS • SANITIZED FOR MAXIMUM NETWORK SPEED</p>
        </div>
      </footer>
    </div>
  );
}
