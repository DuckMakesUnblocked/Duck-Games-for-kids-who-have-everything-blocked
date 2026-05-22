import { useEffect, useRef, useState } from "react";
import { playSound } from "../utils/audio";

interface SpaceShooterProps {
  onScore: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  restartKey: number;
}

const WIDTH = 600;
const HEIGHT = 400;

const getMaxAmmo = (lvl: number) => {
  return Math.max(100, 700 - (lvl - 1) * 60);
};

type Laser = {
  x: number;
  y: number;
  dy: number;
  fromPlayer: boolean;
};

type Invader = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  points: number;
  color: string;
};

export default function SpaceShooter({ onScore, onGameOver, isPaused, restartKey }: SpaceShooterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // States
  const [playerX, setPlayerX] = useState(WIDTH / 2);
  const [playerHp, setPlayerHp] = useState(3); // 3 hit lives
  const [score, setScore] = useState(0);
  const [isDead, setIsDead] = useState(false);
  const [level, setLevel] = useState(1);
  const [ammo, setAmmo] = useState(700);

  // Refs for logic loop to avoid stale closure state
  const playerXRef = useRef(playerX);
  const playerHpRef = useRef(playerHp);
  const scoreRef = useRef(score);
  const isPausedRef = useRef(isPaused);
  const isDeadRef = useRef(isDead);
  const levelRef = useRef(level);
  const ammoRef = useRef(700);

  // Synchronize state props with game loop refs
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Active elements
  const lasersRef = useRef<Laser[]>([]);
  const invadersRef = useRef<Invader[]>([]);
  const coinsRef = useRef<{ x: number; y: number }[]>([]);

  // Keyboard state
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastShotTime = useRef<number>(0);

  const spawnInvaders = (lvl: number) => {
    const list: Invader[] = [];
    const rows = Math.min(4, 2 + Math.floor(lvl / 2));
    const cols = 7;
    const spacingX = 64;
    const spacingY = 32;

    const startX = (WIDTH - (cols * spacingX)) / 2;
    const startY = 40;

    let id = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Higher level enemies have more hp
        const hp = r === 0 ? 2 : 1;
        list.push({
          id: id++,
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          width: 24,
          height: 18,
          hp,
          maxHp: hp,
          points: (rows - r) * 15,
          color: r === 0 ? "#f43f5e" : r === 1 ? "#ec4899" : "#a855f7",
        });
      }
    }
    invadersRef.current = list;
  };

  const spawnBoss = (lvl: number) => {
    invadersRef.current = [
      {
        id: 999,
        x: WIDTH / 2 - 40,
        y: 60,
        width: 80,
        height: 48,
        hp: 15 + lvl * 5,
        maxHp: 15 + lvl * 5,
        points: 500,
        color: "#fb923c", // Big orange boss
      },
    ];
  };

  const resetGame = () => {
    setPlayerX(WIDTH / 2);
    setPlayerHp(3);
    setScore(0);
    onScore(0);
    setLevel(1);
    setIsDead(false);
    setAmmo(getMaxAmmo(1));

    playerXRef.current = WIDTH / 2;
    playerHpRef.current = 3;
    scoreRef.current = 0;
    levelRef.current = 1;
    isDeadRef.current = false;
    ammoRef.current = getMaxAmmo(1);

    lasersRef.current = [];
    coinsRef.current = [];
    spawnInvaders(1);
  };

  useEffect(() => {
    resetGame();
  }, [restartKey]);

  // Keys listener with scroll prevents
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["Space", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      keysPressed.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const shootLaser = () => {
    if (isPausedRef.current || isDeadRef.current) return;
    if (ammoRef.current <= 0) {
      playSound("hit"); // Click sound for out of ammo
      return;
    }
    const now = Date.now();
    if (now - lastShotTime.current > 280) { // Limit fire rates
      lasersRef.current.push({
        x: playerXRef.current + 12, // center of player ship
        y: HEIGHT - 45,
        dy: -6.5,
        fromPlayer: true,
      });
      playSound("laser");
      ammoRef.current -= 1;
      setAmmo(ammoRef.current);
      lastShotTime.current = now;
    }
  };

  const moveAction = (direction: "LEFT" | "RIGHT" | "SHOOT") => {
    if (isPausedRef.current || isDeadRef.current) return;
    if (direction === "LEFT") {
      playerXRef.current = Math.max(10, playerXRef.current - 18);
      setPlayerX(playerXRef.current);
    } else if (direction === "RIGHT") {
      playerXRef.current = Math.min(WIDTH - 35, playerXRef.current + 18);
      setPlayerX(playerXRef.current);
    } else if (direction === "SHOOT") {
      shootLaser();
    }
  };

  // Dedicated Frame Draw logic reading from stable refs
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pX = playerXRef.current;
    const pHp = playerHpRef.current;
    const isP = isPausedRef.current;
    const isD = isDeadRef.current;
    const lvl = levelRef.current;
    const scr = scoreRef.current;

    // Clear board space stars background
    ctx.fillStyle = "#0c0a0c";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw little twinkling background retro stars
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    for (let i = 0; i < 20; i++) {
      const starX = (i * 37) % WIDTH;
      const starY = (i * 49 + Math.floor(Date.now() / 80)) % HEIGHT;
      ctx.fillRect(starX, starY, 1.5, 1.5);
    }

    // Draw UI Heads Up Level indicator
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = "left";
    ctx.fillText(`SECTOR FLIGHT: ${lvl}`, 20, 25);

    // Draw Ammo capacity on the left too
    ctx.textAlign = "left";
    const currentMax = getMaxAmmo(lvl);
    if (ammoRef.current <= 0) {
      // Blinking warning text
      ctx.fillStyle = Math.floor(Date.now() / 250) % 2 === 0 ? "#ef4444" : "rgba(239, 68, 68, 0.4)";
      ctx.fillText(`AMMO: OUT OF AMMO!`, 20, 42);
    } else {
      ctx.fillStyle = ammoRef.current < currentMax * 0.25 ? "#f97316" : "#06b6d4";
      ctx.fillText(`AMMO: ${ammoRef.current} / ${currentMax}`, 20, 42);
    }

    // Draw Shields Health Bar at top right
    ctx.textAlign = "right";
    if (pHp <= 0) {
      // Blinking warning text for depleted shields (vulnerable state)
      ctx.fillStyle = Math.floor(Date.now() / 250) % 2 === 0 ? "#ef4444" : "rgba(239, 68, 68, 0.4)";
      ctx.fillText("SHIELDS: UNPROTECTED!", WIDTH - 20, 25);
    } else {
      ctx.fillStyle = pHp === 3 ? "#10b981" : pHp === 2 ? "#eab308" : "#ef4444";
      ctx.fillText(`SHIELDS: ${"█ ".repeat(pHp)}`, WIDTH - 20, 25);
    }

    // Draw Lasers
    lasersRef.current.forEach((l) => {
      if (l.fromPlayer) {
        ctx.fillStyle = "#06b6d4"; // cyan player lasers
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#06b6d4";
        ctx.fillRect(l.x - 1, l.y, 2, 8);
      } else {
        // Enemy bullets: larger, brighter neon red/pink, with a white laser core for maximum visibility
        ctx.fillStyle = "#ff0055"; // Hot neon pink/red
        ctx.shadowBlur = 12;       // Double the glow radius
        ctx.shadowColor = "#ff0055";
        ctx.fillRect(l.x - 2, l.y - 1, 4, 11); // Thicker (width: 4px, height: 11px)

        // Bright white core to make it flash and highly visible
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 0;
        ctx.fillRect(l.x - 0.5, l.y, 1, 9);
      }
      ctx.shadowBlur = 0;
    });

    // Draw Invaders
    invadersRef.current.forEach((inv) => {
      ctx.fillStyle = inv.color;
      ctx.shadowBlur = inv.id === 999 ? 12 : 0;
      ctx.shadowColor = inv.color;

      ctx.fillRect(inv.x, inv.y, inv.width, inv.height);

      // Level / boss HP indicator
      if (inv.id === 999) {
        // Red boss health status gauge line on top of it
        const hpPct = inv.hp / inv.maxHp;
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(inv.x, inv.y - 12, inv.width, 3);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(inv.x, inv.y - 12, inv.width * hpPct, 3);
      } else {
        // cute retro block details
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(inv.x + 3, inv.y + 3, inv.width - 6, 4);
      }
      ctx.shadowBlur = 0;
    });

    // Draw Player Ship
    if (pHp <= 0) {
      // Unprotected: no neon shield glow, duller high-tech armor styling to convey exposure
      ctx.fillStyle = "#94a3b8"; // Slate gray exposed hull
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = "#06b6d4"; // Cyan aircraft glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#06b6d4";
    }
    
    // Sleek triangular shape rocket vector
    ctx.beginPath();
    ctx.moveTo(pX + 12, HEIGHT - 45); // top tip
    ctx.lineTo(pX, HEIGHT - 20); // bottom left
    ctx.lineTo(pX + 24, HEIGHT - 20); // bottom right
    ctx.closePath();
    ctx.fill();

    // Jet flame booster flickering
    ctx.fillStyle = Math.random() < 0.5 ? "#f97316" : "#ef4444";
    ctx.beginPath();
    ctx.moveTo(pX + 8, HEIGHT - 20);
    ctx.lineTo(pX + 12, HEIGHT - 10 - Math.random() * 8);
    ctx.lineTo(pX + 16, HEIGHT - 20);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0; // reset

    // Draw Base Line Defense
    ctx.strokeStyle = "rgba(239, 68, 68, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT - 55);
    ctx.lineTo(WIDTH, HEIGHT - 55);
    ctx.stroke();

    // Pause / Over screens
    if (isP) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#ffffff";
      ctx.font = 'bold 24px "Space Grotesk", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", WIDTH / 2, HEIGHT / 2);
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillStyle = "#9ca3af";
      ctx.fillText("Press Space or click Resume to continue", WIDTH / 2, HEIGHT / 2 + 30);
    } else if (isD) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#ef4444";
      ctx.font = 'bold 28px "Space Grotesk", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("SHIP DESTROYED", WIDTH / 2, HEIGHT / 2 - 10);
      ctx.fillStyle = "#ffffff";
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText(`Final Score: ${scr}`, WIDTH / 2, HEIGHT / 2 + 25);
      ctx.fillStyle = "#6b7280";
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText("Click RESTART to deploy coordinates again", WIDTH / 2, HEIGHT / 2 + 55);
    }
  };

  // Main custom rendering loop
  useEffect(() => {
    let animationFrameId: number;
    let invaderDirection = 1; // 1 = right, -1 = left
    let invaderMoveTimer = 0;

    const gameLoop = () => {
      if (isPausedRef.current || isDeadRef.current) {
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // 1. Move player with arrow keys or A/D
      let currentX = playerXRef.current;
      const speed = 5.5;
      if (keysPressed.current["ArrowLeft"] || keysPressed.current["KeyA"]) {
        currentX = Math.max(10, currentX - speed);
      }
      if (keysPressed.current["ArrowRight"] || keysPressed.current["KeyD"]) {
        currentX = Math.min(WIDTH - 35, currentX + speed);
      }
      playerXRef.current = currentX;
      setPlayerX(currentX);

      // Auto-shoot holding space down
      if (keysPressed.current["Space"]) {
        shootLaser();
      }

      // 2. Update existing Lasers physics
      let currentLasers = [...lasersRef.current];
      currentLasers.forEach((l) => {
        l.y += l.dy;
      });

      // Filter lasers within view limits
      currentLasers = currentLasers.filter((l) => l.y > 0 && l.y < HEIGHT);

      // 3. Move Invaders
      invaderMoveTimer++;
      const speedInterval = Math.max(10, 40 - levelRef.current * 4);
      let list = [...invadersRef.current];

      if (list.length === 0) {
        // Level cleared! Advance!
        const nextLvl = levelRef.current + 1;
        levelRef.current = nextLvl;
        setLevel(nextLvl);

        // Advance level ammo limits
        const nextMaxAmmo = getMaxAmmo(nextLvl);
        ammoRef.current = nextMaxAmmo;
        setAmmo(nextMaxAmmo);

        // Regenerate shields back to three
        playerHpRef.current = 3;
        setPlayerHp(3);

        playSound("powerup");
        if (nextLvl % 3 === 0) {
          spawnBoss(nextLvl);
        } else {
          spawnInvaders(nextLvl);
        }
        list = [...invadersRef.current];
      }

      if (invaderMoveTimer >= speedInterval && list.length > 0) {
        invaderMoveTimer = 0;
        
        // Check if any invader hit edge bounds to drop down
        let reachedEdge = false;
        const widthPadding = 12;

        list.forEach((inv) => {
          if (inv.id === 999) {
            // Boss moves differently (floating wave)
            return;
          }
          if (invaderDirection === 1 && inv.x + inv.width > WIDTH - widthPadding) {
            reachedEdge = true;
          } else if (invaderDirection === -1 && inv.x < widthPadding) {
            reachedEdge = true;
          }
        });

        if (reachedEdge) {
          invaderDirection = -invaderDirection;
          list.forEach((inv) => {
            if (inv.id !== 999) {
              inv.y += 14;
            }
          });
        } else {
          list.forEach((inv) => {
            if (inv.id !== 999) {
              inv.x += invaderDirection * 8;
            }
          });
        }

        // Random chance of standard invader shooting laser downwards
        if (Math.random() < 0.2 + (levelRef.current * 0.05)) {
          const shooterIdx = Math.floor(Math.random() * list.length);
          const shooter = list[shooterIdx];
          currentLasers.push({
            x: shooter.x + shooter.width / 2,
            y: shooter.y + shooter.height,
            dy: 3.5 + levelRef.current * 0.4,
            fromPlayer: false,
          });
        }
      }

      // Handle boss movement (id = 999)
      list.forEach((inv) => {
        if (inv.id === 999) {
          // Slide side to side smoothly using a sine wave
          inv.x = WIDTH / 2 - inv.width / 2 + Math.sin(Date.now() * 0.0018) * (WIDTH / 2 - 70);
          if (Math.random() < 0.06) {
            // Boss rapid laser shots!
            currentLasers.push({
              x: inv.x + inv.width / 4,
              y: inv.y + inv.height,
              dy: 4.5,
              fromPlayer: false,
            });
            currentLasers.push({
              x: inv.x + (inv.width * 3) / 4,
              y: inv.y + inv.height,
              dy: 4.5,
              fromPlayer: false,
            });
          }
        }
      });

      // 4. Hit Calculations
      const survivingInvaders: Invader[] = [];
      let playerHpValue = playerHpRef.current;
      let scoreAcc = scoreRef.current;

      list.forEach((inv) => {
        let isHitDead = false;

        // Check player's weapon lasers hitting the enemy
        currentLasers = currentLasers.filter((l) => {
          if (
            l.fromPlayer &&
            l.x > inv.x &&
            l.x < inv.x + inv.width &&
            l.y > inv.y &&
            l.y < inv.y + inv.height
          ) {
            // LASER HIT!
            inv.hp -= 1;
            playSound("hit");
            if (inv.hp <= 0) {
              isHitDead = true;
              scoreAcc += inv.points;
              scoreRef.current = scoreAcc;
              setScore(scoreAcc);
              onScore(scoreAcc);
              playSound("explosion");
            }
            return false; // delete laser
          }
          return true;
        });

        // Check alien ship colliding with player
        if (inv.y + inv.height > HEIGHT - 55) {
          // Instantly dead if aliens reach the base!
          playerHpValue = -1;
        }

        if (!isHitDead) {
          survivingInvaders.push(inv);
        }
      });

      // Check alien hazard bullet lasers hitting player ship
      currentLasers = currentLasers.filter((l) => {
        if (!l.fromPlayer) {
          const pShipX = playerXRef.current;
          if (
            l.x > pShipX - 2 &&
            l.x < pShipX + 26 &&
            l.y > HEIGHT - 45 &&
            l.y < HEIGHT - 15
          ) {
            // PLAYER HIT SHIELDS DECREASED
            playerHpValue -= 1;
            playerHpRef.current = playerHpValue;
            setPlayerHp(playerHpValue);
            playSound("explosion");
            return false; // discard laser
          }
        }
        return true;
      });

      lasersRef.current = currentLasers;
      invadersRef.current = survivingInvaders;

      // Handle direct death cascade
      if (playerHpValue < 0) {
        isDeadRef.current = true;
        setIsDead(true);
        playSound("gameover");
        onGameOver(scoreRef.current);
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      draw();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="flex flex-col items-center select-none" id="shooter-game-viewport">
      <div className="relative border-4 border-cyan-950/80 rounded bg-[#0c0a0c] overflow-hidden shadow-2xl shadow-cyan-500/10">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block max-w-full aspect-[3/2]"
          id="shooter-canvas"
        />
      </div>

      {/* Responsive mobile touch game button layouts */}
      <div className="mt-4 flex gap-4 w-full max-w-[320px] md:hidden justify-center" id="shooter-mobile-controls">
        <button
          onClick={() => moveAction("LEFT")}
          className="bg-zinc-800 text-white active:bg-cyan-600 border border-zinc-700 px-5 py-3 rounded font-bold"
          id="btn-shooter-left"
        >
          ◀ Move
        </button>
        <button
          onClick={() => moveAction("SHOOT")}
          className="bg-cyan-600 active:bg-cyan-500 text-white uppercase px-7 py-3 rounded font-bold shadow-lg"
          id="btn-shooter-shoot"
        >
          💥 FIRE
        </button>
        <button
          onClick={() => moveAction("RIGHT")}
          className="bg-zinc-800 text-white active:bg-cyan-600 border border-zinc-700 px-5 py-3 rounded font-bold"
          id="btn-shooter-right"
        >
          Move ▶
        </button>
      </div>
    </div>
  );
}
