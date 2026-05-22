import React, { useEffect, useRef } from "react";
import { playSound } from "../utils/audio";

interface FlappyProps {
  onScore: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  restartKey: number;
}

const WIDTH = 600;
const HEIGHT = 400;
const GRAVITY = 0.14;
const JUMP_STRENGTH = -3.5;
const PIPE_WIDTH = 60;
const PIPE_GAP = 125;
const PIPE_SPACING = 280; // distance between pipes
const BIRD_RADIUS = 13;

type Pipe = {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
};

export default function FlappyBird({ onScore, onGameOver, isPaused, restartKey }: FlappyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use refs for physics state to avoid high-frequency React rerenders clobbering game loop data
  const birdYRef = useRef(HEIGHT / 2);
  const velocityRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const isDeadRef = useRef(false);
  const isPausedRef = useRef(isPaused);

  // Sync isPaused prop to ref
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Handle initialization and restarts
  const resetGame = () => {
    birdYRef.current = HEIGHT / 2 - 30;
    velocityRef.current = 0;
    scoreRef.current = 0;
    isDeadRef.current = false;
    onScore(0);

    // Build initial pipes layout
    const initialPipes: Pipe[] = [];
    for (let i = 0; i < 3; i++) {
      const topHeight = Math.floor(Math.random() * (HEIGHT - PIPE_GAP - 90)) + 40;
      initialPipes.push({
        x: WIDTH + 100 + i * PIPE_SPACING,
        topHeight,
        bottomHeight: HEIGHT - topHeight - PIPE_GAP,
        passed: false,
      });
    }
    pipesRef.current = initialPipes;
  };

  useEffect(() => {
    resetGame();
  }, [restartKey]);

  // Setup keyboard flapping
  useEffect(() => {
    const preventScroll = (e: KeyboardEvent) => {
      if (e.code === "Space") e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        preventScroll(e);
        flapJump();
      }
    };

    window.addEventListener("keydown", preventScroll, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", preventScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const flapJump = () => {
    if (isPausedRef.current || isDeadRef.current) return;
    velocityRef.current = JUMP_STRENGTH;
    playSound("jump");
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    flapJump();
  };

  // Continuous Game Loop and Drawer
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = () => {
      // Always draw even when paused/dead to reflect real-time button clicks/changes
      if (isPausedRef.current || isDeadRef.current) {
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // 1. Process Gravity & Fly Position
      let currentY = birdYRef.current;
      let currentVelocity = velocityRef.current;

      currentVelocity += GRAVITY;
      currentY += currentVelocity;

      // Drop boundaries check
      if (currentY > HEIGHT - BIRD_RADIUS - 10) {
        currentY = HEIGHT - BIRD_RADIUS - 10;
        isDeadRef.current = true;
        playSound("gameover");
        onGameOver(scoreRef.current);
      }
      if (currentY < BIRD_RADIUS) {
        currentY = BIRD_RADIUS;
        currentVelocity = 0;
      }

      birdYRef.current = currentY;
      velocityRef.current = currentVelocity;

      // 2. Process scrolling obstacles
      const scrollSpeed = 1.8;
      const currentPipes = pipesRef.current.map((p) => ({ ...p }));

      for (let i = 0; i < currentPipes.length; i++) {
        const p = currentPipes[i];
        p.x -= scrollSpeed;

        // Score Trigger Check
        if (!p.passed && p.x + PIPE_WIDTH < WIDTH / 3) {
          p.passed = true;
          scoreRef.current += 1;
          onScore(scoreRef.current);
          playSound("score");
        }

        // Recycle pipes that scrolled out of bounds
        if (p.x < -PIPE_WIDTH) {
          const maxPipeX = Math.max(...currentPipes.map((pipesIter) => pipesIter.x));
          p.x = maxPipeX + PIPE_SPACING;
          p.topHeight = Math.floor(Math.random() * (HEIGHT - PIPE_GAP - 90)) + 40;
          p.bottomHeight = HEIGHT - p.topHeight - PIPE_GAP;
          p.passed = false;
        }

        // Collision Check
        const birdX = WIDTH / 3;
        if (birdX + BIRD_RADIUS > p.x && birdX - BIRD_RADIUS < p.x + PIPE_WIDTH) {
          if (currentY - BIRD_RADIUS < p.topHeight || currentY + BIRD_RADIUS > HEIGHT - p.bottomHeight) {
            isDeadRef.current = true;
            playSound("gameover");
            onGameOver(scoreRef.current);
          }
        }
      }

      pipesRef.current = currentPipes;

      draw();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const birdY = birdYRef.current;
      const velocity = velocityRef.current;
      const pipes = pipesRef.current;
      const score = scoreRef.current;
      const isDead = isDeadRef.current;
      const isPaused = isPausedRef.current;

      // Background Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      skyGrad.addColorStop(0, "#020617");
      skyGrad.addColorStop(0.7, "#0f172a");
      skyGrad.addColorStop(1, "#172554");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Starry sky accents / Dynamic clouds
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.arc(100, 80, 45, 0, Math.PI * 2);
      ctx.arc(140, 75, 55, 0, Math.PI * 2);
      ctx.arc(180, 80, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(440, 150, 30, 0, Math.PI * 2);
      ctx.arc(470, 145, 35, 0, Math.PI * 2);
      ctx.fill();

      // Road Divider Floor
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, HEIGHT - 10, WIDTH, 10);
      ctx.fillStyle = "#fb7185";
      ctx.fillRect(0, HEIGHT - 12, WIDTH, 2);

      // Draw obstacle laser walls
      pipes.forEach((p) => {
        const pipeGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
        pipeGrad.addColorStop(0, "#15803d");
        pipeGrad.addColorStop(0.3, "#22c55e");
        pipeGrad.addColorStop(1, "#166534");
        ctx.fillStyle = pipeGrad;

        // Top Obstacle
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.topHeight);

        // Top Lip
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(p.x - 3, p.topHeight - 14, PIPE_WIDTH + 6, 14);
        ctx.strokeRect(p.x - 3, p.topHeight - 14, PIPE_WIDTH + 6, 14);

        // Bottom Obstacle
        ctx.fillStyle = pipeGrad;
        ctx.fillRect(p.x, HEIGHT - p.bottomHeight, PIPE_WIDTH, p.bottomHeight);
        ctx.strokeRect(p.x, HEIGHT - p.bottomHeight, PIPE_WIDTH, p.bottomHeight);

        // Bottom Lip
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(p.x - 3, HEIGHT - p.bottomHeight, PIPE_WIDTH + 6, 14);
        ctx.strokeRect(p.x - 3, HEIGHT - p.bottomHeight, PIPE_WIDTH + 6, 14);
      });

      // Draw Quantum Bird
      const birdX = WIDTH / 3;
      ctx.save();
      ctx.translate(birdX, birdY);

      const angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 7, velocity * 0.08));
      ctx.rotate(angle);

      // Yellow core
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Orange beak
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(BIRD_RADIUS - 2, -4);
      ctx.lineTo(BIRD_RADIUS + 8, 0);
      ctx.lineTo(BIRD_RADIUS - 2, 4);
      ctx.closePath();
      ctx.fill();

      // Big graphic pixel eyes
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(4, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(5, -4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Wing coordinates
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      if (velocity < 0) {
        ctx.ellipse(-6, 2, 8, 4, Math.PI / 6, 0, Math.PI * 2);
      } else {
        ctx.ellipse(-6, -1, 8, 5, -Math.PI / 6, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.restore();

      // Pause & GameOver overlays
      if (isPaused) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold 24px "Space Grotesk", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", WIDTH / 2, HEIGHT / 2);
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillStyle = "#9ca3af";
        ctx.fillText("Press Space or click screen to resume", WIDTH / 2, HEIGHT / 2 + 30);
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
        ctx.fillText("Click RESTART to spawn again", WIDTH / 2, HEIGHT / 2 + 55);
      }
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="flex flex-col items-center select-none" id="flappy-game-viewport">
      <div className="relative border-4 border-yellow-950/80 rounded bg-[#0c0a0c] overflow-hidden shadow-2xl shadow-yellow-500/10">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onClick={handleCanvasClick}
          className="block max-w-full aspect-[3/2] cursor-pointer touch-none"
          id="flappy-canvas"
        />
      </div>
      <p className="mt-2 text-xs text-gray-400 font-mono">
        💡 Tap anywhere on screen OR press Spacebar to flight-flap upper vertical boosts!
      </p>
    </div>
  );
}
