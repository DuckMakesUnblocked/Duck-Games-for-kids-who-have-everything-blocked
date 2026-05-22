import { useEffect, useRef, useState } from "react";
import { playSound } from "../utils/audio";

interface SnakeProps {
  onScore: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  restartKey: number;
}

type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const GRID_SIZE = 20;
const WIDTH = 600;
const HEIGHT = 400;

export default function Snake({ onScore, onGameOver, isPaused, restartKey }: SnakeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state
  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [isSuperFood, setIsSuperFood] = useState(false);
  const [superFoodTimer, setSuperFoodTimer] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [isDead, setIsDead] = useState(false);

  // Refs to share with loop or key listener
  const directionRef = useRef<Direction>("RIGHT");
  directionRef.current = direction;

  const snakeRef = useRef<Point[]>(snake);
  snakeRef.current = snake;

  const foodRef = useRef<Point>(food);
  foodRef.current = food;

  const isSuperFoodRef = useRef<boolean>(isSuperFood);
  isSuperFoodRef.current = isSuperFood;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const isDeadRef = useRef<boolean>(isDead);
  isDeadRef.current = isDead;

  // Initialize/Restart Game
  useEffect(() => {
    resetGame();
  }, [restartKey]);

  const resetGame = () => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    setSnake(initialSnake);
    setDirection("RIGHT");
    setCurrentScore(0);
    onScore(0);
    setIsDead(false);
    setIsSuperFood(false);
    generateFood(initialSnake);
  };

  // Helper to generate food away from snake
  const generateFood = (currentSnake: Point[]) => {
    const maxX = WIDTH / GRID_SIZE;
    const maxY = HEIGHT / GRID_SIZE;
    let newFood: Point;
    
    // Fallback security loop limit
    let attempts = 0;
    do {
      newFood = {
        x: Math.floor(Math.random() * maxX),
        y: Math.floor(Math.random() * maxY),
      };
      attempts++;
    } while (
      currentSnake.some((segment) => segment.x === newFood.x && segment.y === newFood.y) &&
      attempts < 100
    );

    setFood(newFood);
    // 20% chance of super golden food
    const isSuper = Math.random() < 0.2;
    setIsSuperFood(isSuper);
    if (isSuper) {
      setSuperFoodTimer(40); // 40 ticks to eat it
    }
  };

  // Intercept Arrow keys only when user interacts with standard controls
  useEffect(() => {
    const preventScroll = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDeadRef.current || isPausedRef.current) return;

      const currentDir = directionRef.current;
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          if (currentDir !== "DOWN") setDirection("UP");
          preventScroll(e);
          break;
        case "ArrowDown":
        case "KeyS":
          if (currentDir !== "UP") setDirection("DOWN");
          preventScroll(e);
          break;
        case "ArrowLeft":
        case "KeyA":
          if (currentDir !== "RIGHT") setDirection("LEFT");
          preventScroll(e);
          break;
        case "ArrowRight":
        case "KeyD":
          if (currentDir !== "LEFT") setDirection("RIGHT");
          preventScroll(e);
          break;
        case "Space":
          preventScroll(e);
          break;
      }
    };

    window.addEventListener("keydown", preventScroll, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", preventScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Update Game Loop
  useEffect(() => {
    let lastTime = 0;
    // Determine dynamic speeds based on currentScore
    const getInterval = () => Math.max(70, 140 - Math.floor(currentScore / 5) * 6);
    
    let timerId: any;

    const gameTick = () => {
      if (isPausedRef.current || isDeadRef.current) {
        timerId = setTimeout(gameTick, 100);
        return;
      }

      const prevSnake = snakeRef.current;
      if (prevSnake.length === 0) {
        timerId = setTimeout(gameTick, getInterval());
        return;
      }

      const head = { ...prevSnake[0] };
      const currentDir = directionRef.current;

      // Calculate next head position
      switch (currentDir) {
        case "UP": head.y -= 1; break;
        case "DOWN": head.y += 1; break;
        case "LEFT": head.x -= 1; break;
        case "RIGHT": head.x += 1; break;
      }

      const maxX = WIDTH / GRID_SIZE;
      const maxY = HEIGHT / GRID_SIZE;

      // Border Collision check
      if (head.x < 0 || head.x >= maxX || head.y < 0 || head.y >= maxY) {
        setIsDead(true);
        playSound("gameover");
        onGameOver(currentScore);
        timerId = setTimeout(gameTick, getInterval());
        return;
      }

      // Self Collision check
      if (prevSnake.some((segment) => segment.x === head.x && segment.y === head.y)) {
        setIsDead(true);
        playSound("gameover");
        onGameOver(currentScore);
        timerId = setTimeout(gameTick, getInterval());
        return;
      }

      const newSnake = [head, ...prevSnake];
      const currentFood = foodRef.current;

      // Check food collision
      if (head.x === currentFood.x && head.y === currentFood.y) {
        const scoreGain = isSuperFoodRef.current ? 3 : 1;
        const nextScore = currentScore + scoreGain;
        
        if (isSuperFoodRef.current) {
          playSound("powerup");
        } else {
          playSound("score");
        }

        setCurrentScore(nextScore);
        onScore(nextScore);
        setSnake(newSnake);
        generateFood(newSnake);
      } else {
        // Remove tail if didn't eat
        newSnake.pop();
        setSnake(newSnake);
      }

      // Handle custom superfood timer countdown sequence
      setSuperFoodTimer((prev) => {
        if (prev <= 1) {
          if (isSuperFoodRef.current) {
            setIsSuperFood(false);
          }
          return 0;
        }
        return prev - 1;
      });

      timerId = setTimeout(gameTick, getInterval());
    };

    timerId = setTimeout(gameTick, getInterval());

    return () => clearTimeout(timerId);
  }, [currentScore]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear board
    ctx.fillStyle = "#0c0a0c"; // deep charcoal retro
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw grid board subtle patterns for style
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    for (let x = 0; x < WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    // Draw Food
    const currentFood = foodRef.current;
    if (isSuperFood) {
      // Golden special fruit
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#eab308";
      ctx.fillStyle = "#eab308"; // Golden glow
      ctx.beginPath();
      ctx.arc(
        currentFood.x * GRID_SIZE + GRID_SIZE / 2,
        currentFood.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    } else {
      // Standard candy cherry
      ctx.fillStyle = "#ef4444"; // red
      ctx.beginPath();
      ctx.arc(
        currentFood.x * GRID_SIZE + GRID_SIZE / 2,
        currentFood.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Draw Snake
    const currentSnake = snakeRef.current;
    currentSnake.forEach((segment, idx) => {
      // Shading based on segment index for gorgeous snake tail gradient
      if (idx === 0) {
        ctx.fillStyle = "#10b981"; // Bright emerald head
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#10b981";
      } else {
        ctx.fillStyle = `rgba(16, 185, 129, ${Math.max(0.4, 1 - idx / currentSnake.length)})`;
        ctx.shadowBlur = 0;
      }

      ctx.fillRect(
        segment.x * GRID_SIZE + 1.5,
        segment.y * GRID_SIZE + 1.5,
        GRID_SIZE - 3,
        GRID_SIZE - 3
      );
      
      // Draw minimal cute eyes
      if (idx === 0) {
        ctx.fillStyle = "#ffffff";
        const currentDir = directionRef.current;
        if (currentDir === "UP" || currentDir === "DOWN") {
          ctx.fillRect(segment.x * GRID_SIZE + 4, segment.y * GRID_SIZE + 8, 3, 3);
          ctx.fillRect(segment.x * GRID_SIZE + 12, segment.y * GRID_SIZE + 8, 3, 3);
        } else {
          ctx.fillRect(segment.x * GRID_SIZE + 8, segment.y * GRID_SIZE + 4, 3, 3);
          ctx.fillRect(segment.x * GRID_SIZE + 8, segment.y * GRID_SIZE + 12, 3, 3);
        }
      }
    });
    ctx.shadowBlur = 0; // restore

    // Super food timer indicator border
    if (isSuperFood && superFoodTimer > 0) {
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 2;
      ctx.strokeRect(3, 3, WIDTH - 6, HEIGHT - 6);
    }

    // Draw "Pause" or "Game Over" message directly on canvas for style
    if (isPaused) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#ffffff";
      ctx.font = 'bold 24px "Space Grotesk", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", WIDTH / 2, HEIGHT / 2);
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillStyle = "#9ca3af";
      ctx.fillText("Press Space or click Resume to continue", WIDTH / 2, HEIGHT / 2 + 30);
    } else if (isDead) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#ef4444";
      ctx.font = 'bold 28px "Space Grotesk", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 10);
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`Final Score: ${currentScore}`, WIDTH / 2, HEIGHT / 2 + 25);
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillStyle = "#6b7280";
      ctx.fillText("Click RESTART to try again", WIDTH / 2, HEIGHT / 2 + 55);
    }
  }, [snake, food, isSuperFood, superFoodTimer, isPaused, isDead]);

  // Touch UI layout buttons
  const sendDirectionAction = (newDir: Direction) => {
    if (isDead || isPaused) return;
    const currentDir = directionRef.current;
    if (newDir === "UP" && currentDir !== "DOWN") setDirection("UP");
    if (newDir === "DOWN" && currentDir !== "UP") setDirection("DOWN");
    if (newDir === "LEFT" && currentDir !== "RIGHT") setDirection("LEFT");
    if (newDir === "RIGHT" && currentDir !== "LEFT") setDirection("RIGHT");
  };

  return (
    <div className="flex flex-col items-center select-none" id="snake-game-viewport">
      <div className="relative border-4 border-emerald-950/80 rounded bg-[#0c0a0c] overflow-hidden shadow-2xl shadow-emerald-900/10">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block max-w-full aspect-[3/2]"
          id="snake-canvas"
        />
      </div>

      {/* On-screen visual game buttons for mobile players */}
      <div className="mt-4 grid grid-cols-3 gap-2 w-full max-w-[180px] md:hidden" id="snake-mobile-controls">
        <div />
        <button
          onClick={() => sendDirectionAction("UP")}
          className="bg-zinc-800 text-white active:bg-emerald-600 border border-zinc-700 p-3 rounded flex items-center justify-center font-bold text-lg"
          id="btn-snake-up"
        >
          ▲
        </button>
        <div />
        <button
          onClick={() => sendDirectionAction("LEFT")}
          className="bg-zinc-800 text-white active:bg-emerald-600 border border-zinc-700 p-3 rounded flex items-center justify-center font-bold text-lg"
          id="btn-snake-left"
        >
          ◀
        </button>
        <button
          onClick={() => sendDirectionAction("DOWN")}
          className="bg-zinc-800 text-white active:bg-emerald-600 border border-zinc-700 p-3 rounded flex items-center justify-center font-bold text-lg"
          id="btn-snake-down"
        >
          ▼
        </button>
        <button
          onClick={() => sendDirectionAction("RIGHT")}
          className="bg-zinc-800 text-white active:bg-emerald-600 border border-zinc-700 p-3 rounded flex items-center justify-center font-bold text-lg"
          id="btn-snake-right"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
