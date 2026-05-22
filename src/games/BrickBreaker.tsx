import React, { useEffect, useRef, useState } from "react";
import { playSound } from "../utils/audio";

interface BrickBreakerProps {
  onScore: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  restartKey: number;
}

const WIDTH = 600;
const HEIGHT = 400;
const PADDLE_HEIGHT = 12;
const PADDLE_WIDTH = 90;
const BALL_RADIUS = 6;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_HEIGHT = 16;
const BRICK_PADDING = 6;
const BRICK_OFFSET_TOP = 45;
const BRICK_OFFSET_LEFT = 20;

type Brick = {
  x: number;
  y: number;
  status: number; // 1 = alive, 0 = broken
  color: string;
  points: number;
};

export default function BrickBreaker({ onScore, onGameOver, isPaused, restartKey }: BrickBreakerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // States
  const [paddleX, setPaddleX] = useState((WIDTH - PADDLE_WIDTH) / 2);
  const [ball, setBall] = useState({ x: WIDTH / 2, y: HEIGHT - 50, dx: 2.2, dy: -2.2 });
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [isDead, setIsDead] = useState(false);

  // Refs for animation loop
  const paddleXRef = useRef(paddleX);
  paddleXRef.current = paddleX;

  const ballRef = useRef(ball);
  ballRef.current = ball;

  const bricksRef = useRef(bricks);
  bricksRef.current = bricks;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const scoreRef = useRef(score);
  scoreRef.current = score;

  const levelRef = useRef(level);
  levelRef.current = level;

  const isDeadRef = useRef(isDead);
  isDeadRef.current = isDead;

  // Track keyboard state
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const generateBricks = (lvl: number): Brick[] => {
    const arr: Brick[] = [];
    // Rainbow rows
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];
    const colWidth = (WIDTH - BRICK_OFFSET_LEFT * 2) / BRICK_COLS;

    for (let c = 0; c < BRICK_COLS; c++) {
      for (let r = 0; r < BRICK_ROWS; r++) {
        arr.push({
          x: c * colWidth + BRICK_PADDING + BRICK_OFFSET_LEFT,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
          status: 1,
          color: colors[r % colors.length],
          points: (BRICK_ROWS - r) * 10,
        });
      }
    }
    return arr;
  };

  const resetGame = (fullReset = true) => {
    if (fullReset) {
      setScore(0);
      onScore(0);
      setLevel(1);
      levelRef.current = 1;
    }
    const newPaddleX = (WIDTH - PADDLE_WIDTH) / 2;
    const newBall = {
      x: WIDTH / 2,
      y: HEIGHT - 50,
      dx: 1.9 + levelRef.current * 0.3,
      dy: -1.9 - levelRef.current * 0.3,
    };
    const newBricks = generateBricks(levelRef.current);

    setPaddleX(newPaddleX);
    setBall(newBall);
    setBricks(newBricks);
    setIsDead(false);

    paddleXRef.current = newPaddleX;
    ballRef.current = newBall;
    bricksRef.current = newBricks;
    isDeadRef.current = false;
  };

  useEffect(() => {
    resetGame(true);
  }, [restartKey]);

  // Handle controls & key events with scroll prevents
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

  // Drag controls for mouse / touch support directly in the canvas for extreme responsiveness
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPausedRef.current || isDeadRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Support relative widths for resized layouts
    const scaleX = WIDTH / rect.width;
    const clientX = e.clientX - rect.left;
    const projectedX = clientX * scaleX - PADDLE_WIDTH / 2;

    const finalX = Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, projectedX));
    setPaddleX(finalX);
  };

  // Main game rendering and engine loop
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = () => {
      if (isPausedRef.current || isDeadRef.current) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // 1. Keyboard logic for paddle movement
      let currentPaddleX = paddleXRef.current;
      const paddleSpeed = 7;
      if (keysPressed.current["ArrowLeft"] || keysPressed.current["KeyA"]) {
        currentPaddleX = Math.max(0, currentPaddleX - paddleSpeed);
      }
      if (keysPressed.current["ArrowRight"] || keysPressed.current["KeyD"]) {
        currentPaddleX = Math.min(WIDTH - PADDLE_WIDTH, currentPaddleX + paddleSpeed);
      }
      setPaddleX(currentPaddleX);

      // 2. Ball physics & logic
      const currentBall = { ...ballRef.current };
      currentBall.x += currentBall.dx;
      currentBall.y += currentBall.dy;

      // Collisions with left/right walls
      if (currentBall.x + currentBall.dx > WIDTH - BALL_RADIUS || currentBall.x + currentBall.dx < BALL_RADIUS) {
        currentBall.dx = -currentBall.dx;
        playSound("hit");
      }

      // Collision with top wall
      if (currentBall.y + currentBall.dy < BALL_RADIUS) {
        currentBall.dy = -currentBall.dy;
        playSound("hit");
      }

      // Ball falls beyond bottom check or hits paddle
      if (currentBall.y + currentBall.dy > HEIGHT - BALL_RADIUS - PADDLE_HEIGHT - 6) {
        // Did it hit paddle?
        if (currentBall.x > currentPaddleX - 3 && currentBall.x < currentPaddleX + PADDLE_WIDTH + 3) {
          // Change angle / speed feedback depending on where ball hit paddle
          const relativeHit = (currentBall.x - (currentPaddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
          const maxAngleX = 5;
          currentBall.dx = relativeHit * maxAngleX;
          currentBall.dy = -Math.abs(currentBall.dy); // strictly reflect upwards
          playSound("hit");
        } else if (currentBall.y > HEIGHT) {
          // DEAD
          setIsDead(true);
          isDeadRef.current = true;
          playSound("gameover");
          onGameOver(scoreRef.current);
          animationFrameId = requestAnimationFrame(gameLoop);
          return;
        }
      }

      // 3. Collision logic with bricks
      const currentBricks = [...bricksRef.current];
      let activeBricksCount = 0;

      for (let i = 0; i < currentBricks.length; i++) {
        const b = currentBricks[i];
        if (b.status === 1) {
          activeBricksCount++;
          // Boundary Box Collision checking
          if (
            currentBall.x + BALL_RADIUS > b.x &&
            currentBall.x - BALL_RADIUS < b.x + (WIDTH - BRICK_OFFSET_LEFT * 2) / BRICK_COLS - BRICK_PADDING &&
            currentBall.y + BALL_RADIUS > b.y &&
            currentBall.y - BALL_RADIUS < b.y + BRICK_HEIGHT
          ) {
            b.status = 0; // destroyed
            currentBall.dy = -currentBall.dy; // reflect
            const newScore = scoreRef.current + b.points;

            playSound("score");
            setScore(newScore);
            onScore(newScore);
            activeBricksCount--;
            break; // only hit one per frame
          }
        }
      }

      setBricks(currentBricks);
      setBall(currentBall);

      // Check level win condition
      if (activeBricksCount === 0 && currentBricks.length > 0) {
        playSound("powerup");
        const nextLvl = levelRef.current + 1;
        setLevel(nextLvl);
        levelRef.current = nextLvl;
        resetGame(false);
        return;
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Drawing Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear Screen
    ctx.fillStyle = "#0c0a0c"; // Deep space background
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Grid details for styling
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    for (let x = 0; x < WIDTH; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }

    // Draw level info at top
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = "left";
    ctx.fillText(`LEVEL ${level}`, BRICK_OFFSET_LEFT, 24);

    // Draw Bricks
    const colWidth = (WIDTH - BRICK_OFFSET_LEFT * 2) / BRICK_COLS;
    bricks.forEach((b) => {
      if (b.status === 1) {
        // Outer rect
        ctx.fillStyle = b.color;
        
        ctx.fillRect(
          b.x,
          b.y,
          colWidth - BRICK_PADDING,
          BRICK_HEIGHT
        );
        
        // Inner lighting details for beautiful 8bit look
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.fillRect(b.x, b.y, colWidth - BRICK_PADDING, 2); // top highlights
      }
    });

    // Draw Paddle
    ctx.fillStyle = "#3b82f6"; // neon blue paddle
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#3b82f6";
    ctx.fillRect(paddleX, HEIGHT - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT);
    // Detail highlight lines
    ctx.fillStyle = "#60a5fa";
    ctx.fillRect(paddleX, HEIGHT - PADDLE_HEIGHT - 10, PADDLE_WIDTH, 3);
    ctx.shadowBlur = 0; // reset

    // Draw Ball
    ctx.fillStyle = "#facc15"; // gold ball
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#facc15";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Pause / Dead Screens
    if (isPaused) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#ffffff";
      ctx.font = 'bold 24px "Space Grotesk", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", WIDTH / 2, HEIGHT / 2);
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillStyle = "#9ca3af";
      ctx.fillText("Press Space or click Resume to resume play", WIDTH / 2, HEIGHT / 2 + 30);
    } else if (isDead) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#ef4444";
      ctx.font = 'bold 28px "Space Grotesk", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 10);
      ctx.fillStyle = "#ffffff";
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText(`Final Score: ${score}`, WIDTH / 2, HEIGHT / 2 + 25);
      ctx.fillStyle = "#6b7280";
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText("Click RESTART to start again", WIDTH / 2, HEIGHT / 2 + 55);
    }
  }, [paddleX, ball, bricks, isPaused, isDead, level]);

  return (
    <div className="flex flex-col items-center select-none" id="brickbreaker-game-viewport">
      <div className="relative border-4 border-blue-950/80 rounded bg-[#0c0a0c] overflow-hidden shadow-2xl shadow-blue-900/10">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerMove={handlePointerMove}
          className="block max-w-full aspect-[3/2] cursor-crosshair touch-none"
          id="brickbreaker-canvas"
        />
      </div>
      <p className="mt-2 text-xs text-gray-500 font-mono hidden md:block">
        💡 Use Left/Right keys OR drag/swipe directly on screen to move the paddle
      </p>
    </div>
  );
}
