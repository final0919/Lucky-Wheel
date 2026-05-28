/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { DartHit, Particle, FloatingText, getSplitSegments } from '../types';
import { sound } from '../utils/audio';
import { Volume2, VolumeX, Sparkles, Navigation, Send, Flame, Target } from 'lucide-react';
import { motion } from 'motion/react';

interface PhysicsGameProps {
  betPoints: number;
  dartCount: number;
  onGameEnd: (hits: DartHit[]) => void;
  onExit: () => void;
}

export default function PhysicsGame({ betPoints, dartCount, onGameEnd, onExit }: PhysicsGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game states
  const [timeLeft, setTimeLeft] = useState(20);
  const [dartsRemaining, setDartsRemaining] = useState(dartCount);
  const [soundEnabled, setSoundEnabled] = useState(sound.isEnabled());
  const [launchMessage, setLaunchMessage] = useState<string>('点击画面任意位置设置圆圈靶心，随后点击“确认发射飞镖”键！');

  // Interactive 2D target controls (Allows both left-right and up-down adjustment!)
  const [aimX, setAimX] = useState(400);
  const [aimY, setAimY] = useState(180); // Centers beautifully at the wheel center

  // Derive joystick rendering angle dynamically from aiming coordinate
  const LAUNCHER_X = 400;
  const LAUNCHER_Y = 520;
  const joystickAngle = Math.atan2(aimX - LAUNCHER_X, LAUNCHER_Y - aimY) * (180 / Math.PI);

  // Power adjustment slider system states
  const MIN_POWER = 6;
  const MAX_POWER = 24;
  const [launchPower, setLaunchPower] = useState(14.5);

  // References for Canvas animation loop
  const requestRef = useRef<number | null>(null);
  const wheelAngleRef = useRef<number>(0);
  
  // Splitted alternating sectors mapped from user points config
  const splitSegments = getSplitSegments(betPoints);

  // Physics config
  const GRAVITY = 0.16; // gravity acceleration
  const WHEEL_X = 400; // Wheel center X
  const WHEEL_Y = 180; // Moved up to give full physical space
  const WHEEL_RADIUS = 145; // Balanced wheel radius for rich flight trajectory

  // Active dart currently flying
  const activeDartRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    stuck: boolean;
    hitColorKey?: string;
    rotation: number;
    totalSteps: number;
    currentStep: number;
  } | null>(null);

  // Stored darts that successfully hit the wheel to rotate with it
  const stuckDartsRef = useRef<Array<{
    localAngle: number; // Angle relative to wheel rotation
    localRadius: number; // Distance from center of wheel
    colorKey: string;
    colorHex: string;
    originalAngle: number;
  }>>([]);

  // Sparks and floating indicators
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const listHitsRef = useRef<DartHit[]>([]);

  // Sound toggler
  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    sound.toggle(nextVal);
  };

  // Keyboard controls for 2D aiming and firing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setAimX(prev => Math.max(50, prev - 10));
        sound.playTick();
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setAimX(prev => Math.min(750, prev + 10));
        sound.playTick();
      } else if (e.key === 'ArrowUp' || e.key === 'w') {
        setAimY(prev => Math.max(50, prev - 10));
        sound.playTick();
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        setAimY(prev => Math.min(500, prev + 10));
        sound.playTick();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        triggerLaunchWithPower(launchPower);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dartsRemaining, timeLeft, aimX, aimY, launchPower]);

  // Timers countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGame();
          return 0;
        }
        if (prev <= 6) {
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Set 2D target (aiming anywhere on the canvas)
  const handlePointerInteraction = (clientX: number, clientY: number) => {
    if (activeDartRef.current) return; // Prevent changing aim while a dart is already in flight
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Scale client bounding coordinates into canvas virtual standard 800x560
    const scaleX = 800 / rect.width;
    const scaleY = 560 / rect.height;
    
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    // Direct 2D coordinates mapping with slight safe paddings
    const cleanX = Math.max(30, Math.min(770, canvasX));
    const cleanY = Math.max(30, Math.min(500, canvasY));
    
    setAimX(cleanX);
    setAimY(cleanY);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeDartRef.current) return;
    e.preventDefault();
    handlePointerInteraction(e.clientX, e.clientY);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeDartRef.current) return;
    if (e.buttons === 1) {
      e.preventDefault();
      handlePointerInteraction(e.clientX, e.clientY);
    }
  };

  // Finish Game logic
  const finishGame = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    if (listHitsRef.current.length > 0) {
      sound.playWin();
    } else {
      sound.playLost();
    }

    onGameEnd(listHitsRef.current);
  };



  // Launch action (computes precise vector based on user targeted position and manually charged power)
  const triggerLaunchWithPower = (powerValue: number) => {
    if (dartsRemaining <= 0) return;
    if (activeDartRef.current) return; // Wait for active dart flight

    sound.playShoot();

    // Direct vector pointing to (aimX, aimY)
    const dx = aimX - LAUNCHER_X;
    const dy = aimY - LAUNCHER_Y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const angleRad = Math.atan2(dy, dx);
    const speed = powerValue;
    const vx = speed * Math.cos(angleRad);
    const vy = speed * Math.sin(angleRad);

    const totalSteps = distance / speed;

    activeDartRef.current = {
      x: LAUNCHER_X,
      y: LAUNCHER_Y,
      vx: vx,
      vy: vy,
      stuck: false,
      rotation: angleRad,
      totalSteps: totalSteps,
      currentStep: 0
    };

    setDartsRemaining(prev => prev - 1);
    setLaunchMessage('发射成功！等待击中大转盘...');
  };

  // Find which split sector is currently at the hit local angle
  const getSegmentAtAngle = (angle: number): { key: string; name: string; color: string; multiplier: number } => {
    let norm = angle % (2 * Math.PI);
    if (norm < 0) norm += 2 * Math.PI;

    let currentAngle = 0;
    for (const segment of splitSegments) {
      const sectorRad = (segment.percentage / 100) * 2 * Math.PI;
      if (norm >= currentAngle && norm < currentAngle + sectorRad) {
        return segment;
      }
      currentAngle += sectorRad;
    }

    return { key: 'white', name: '白色区域', color: '#F3F4F6', multiplier: 0.5 };
  };

  // Particle triggers
  const spawnHitBlast = (x: number, y: number, color: string) => {
    const burstCount = 18;
    for (let i = 0; i < burstCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      particlesRef.current.push({
        x,
        y,
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle) - 1,
        color: color,
        radius: 2 + Math.random() * 3.5,
        alpha: 1,
        life: 0,
        maxLife: 35 + Math.floor(Math.random() * 20)
      });
    }
  };

  // Unified visual frame updates
  useEffect(() => {
    const handleFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;



      // Clear Canvas to dark space
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subtle neon grid decoration lines
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Outer teal/emerald light ring
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.45)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(WHEEL_X, WHEEL_Y, WHEEL_RADIUS + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Spin the wheel - slowed down slightly according to the user request
      wheelAngleRef.current += 0.045; // Moderate and balanced speed
      const currentWheelAngle = wheelAngleRef.current;

      // Draw shredded segments
      let startAngleAccumulator = currentWheelAngle;
      
      splitSegments.forEach((segment) => {
        const sectorRad = (segment.percentage / 100) * (Math.PI * 2);
        if (sectorRad <= 0) return;

        ctx.beginPath();
        ctx.moveTo(WHEEL_X, WHEEL_Y);
        ctx.arc(WHEEL_X, WHEEL_Y, WHEEL_RADIUS, startAngleAccumulator, startAngleAccumulator + sectorRad);
        ctx.closePath();

        ctx.fillStyle = segment.color;
        ctx.fill();

        // Dark grey separation borders between slivers
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Number multipliers are fully removed per requested scope to display clean colors

        startAngleAccumulator += sectorRad;
      });

      // Gold bullseye core cap (reduced size, minimizing the center blank gap!)
      ctx.beginPath();
      ctx.arc(WHEEL_X, WHEEL_Y, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#EAB308';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Stuck darts representation
      stuckDartsRef.current.forEach((stuck) => {
        const renderAngle = stuck.localAngle + currentWheelAngle;
        const renderX = WHEEL_X + stuck.localRadius * Math.cos(renderAngle);
        const renderY = WHEEL_Y + stuck.localRadius * Math.sin(renderAngle);

        ctx.save();
        ctx.translate(renderX, renderY);
        ctx.rotate(renderAngle + Math.PI);

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(22, 0);
        ctx.stroke();

        // Feather wing representation
        ctx.fillStyle = stuck.colorKey === 'white' ? '#EF4444' : stuck.colorHex;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(32, -6);
        ctx.lineTo(32, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });

      // Update active flying dart
      const activeDart = activeDartRef.current;
      if (activeDart) {
        activeDart.x += activeDart.vx;
        activeDart.y += activeDart.vy;
        activeDart.vy += GRAVITY; // apply gravity force

        activeDart.rotation = Math.atan2(activeDart.vy, activeDart.vx);
        activeDart.currentStep += 1;

        // Draw flying dart
        ctx.save();
        ctx.translate(activeDart.x, activeDart.y);
        ctx.rotate(activeDart.rotation);

        // metal tip
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -3.5);
        ctx.lineTo(-10, 3.5);
        ctx.closePath();
        ctx.fill();

        // body tube
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-32, 0);
        ctx.stroke();

        // feathered red tail fin
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(-32, 0);
        ctx.lineTo(-42, -7);
        ctx.lineTo(-38, 0);
        ctx.lineTo(-42, 7);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Collision detection ONLY when flight duration is fully met (reaches deep target face plane)
        if (activeDart.currentStep >= activeDart.totalSteps) {
          const distToWheel = Math.sqrt((activeDart.x - WHEEL_X) ** 2 + (activeDart.y - WHEEL_Y) ** 2);
          
          if (distToWheel <= WHEEL_RADIUS) {
            // HIT SUCCESSFUL!
            const absoluteHitAngle = Math.atan2(activeDart.y - WHEEL_Y, activeDart.x - WHEEL_X);
            const localAngle = absoluteHitAngle - currentWheelAngle;
            
            const hitSegment = getSegmentAtAngle(localAngle);
            
            const hitRecord: DartHit = {
              id: Math.random().toString(),
              colorKey: hitSegment.key,
              colorName: hitSegment.name,
              colorHex: hitSegment.color,
              multiplier: hitSegment.multiplier,
              pointsEarned: 0, // No coin deductions or gambling sums
              hitAngle: localAngle,
              hitRadius: distToWheel <= WHEEL_RADIUS - 10 ? distToWheel : WHEEL_RADIUS - 3,
            };

            listHitsRef.current.push(hitRecord);

            // sticking on orbit
            stuckDartsRef.current.push({
              localAngle: localAngle,
              localRadius: distToWheel <= WHEEL_RADIUS - 10 ? distToWheel : WHEEL_RADIUS - 3,
              colorKey: hitSegment.key,
              colorHex: hitSegment.color,
              originalAngle: activeDart.rotation,
            });

            sound.playHit(hitSegment.key);
            spawnHitBlast(activeDart.x, activeDart.y, hitSegment.color);

            // Floating word
            floatingTextsRef.current.push({
              id: Math.random().toString(),
              text: hitSegment.name.replace('区域', ''),
              x: activeDart.x,
              y: activeDart.y - 30,
              color: hitSegment.color,
              alpha: 1,
              life: 0
            });

            activeDartRef.current = null;
            setLaunchMessage(`超级刺中：${hitSegment.name}！飞镖已锁定！`);

            if (dartsRemaining <= 0) {
              setTimeout(() => {
                finishGame();
              }, 1000);
            }
          } 
          // Boundary missed
          else {
            activeDartRef.current = null;
            setLaunchMessage('可惜脱靶了！按着抛物线重试调整！');
            
            floatingTextsRef.current.push({
              id: Math.random().toString(),
              text: '未中靶',
              x: 400,
              y: 350,
              color: '#64748B',
              alpha: 1,
              life: 0
            });

            sound.playLost();

            if (dartsRemaining <= 0) {
              setTimeout(() => {
                finishGame();
              }, 1000);
            }
          }
        }
      }

      // Draw 2D targeting crosshair (reticle)
      if (!activeDart && dartsRemaining > 0) {
        ctx.strokeStyle = '#10B981'; // Vibrant emerald target color
        ctx.lineWidth = 1.2;
        
        ctx.beginPath();
        ctx.arc(aimX, aimY, 7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(aimX - 12, aimY);
        ctx.lineTo(aimX - 3, aimY);
        ctx.moveTo(aimX + 3, aimY);
        ctx.lineTo(aimX + 12, aimY);
        ctx.moveTo(aimX, aimY - 12);
        ctx.lineTo(aimX, aimY - 3);
        ctx.moveTo(aimX, aimY + 3);
        ctx.lineTo(aimX, aimY + 12);
        ctx.stroke();
      }

      // Draw Cannon Base launcher styled in clean dark emerald slate
      ctx.fillStyle = '#064E3B';
      ctx.beginPath();
      ctx.arc(400, 540, 24, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Launch Barrel pointer
      ctx.save();
      ctx.translate(400, 520);
      ctx.rotate((joystickAngle * Math.PI) / 180);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#14B8A6';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -22);
      ctx.stroke();
      ctx.restore();

      // Particles ticks
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life += 1;
        p.alpha = 1 - (p.life / p.maxLife);

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return p.life < p.maxLife;
      });

      // Float indicators
      floatingTextsRef.current = floatingTextsRef.current.filter((t) => {
        t.y -= 1.1;
        t.life += 1;
        t.alpha = 1 - (t.life / 45);

        ctx.save();
        ctx.globalAlpha = Math.max(0, t.alpha);
        ctx.fillStyle = t.color;
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();

        return t.life < 45;
      });

      requestRef.current = requestAnimationFrame(handleFrame);
    };

    requestRef.current = requestAnimationFrame(handleFrame);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [betPoints, aimX, aimY, dartsRemaining, splitSegments]);

  return (
    <div className="flex flex-col items-center bg-slate-950 p-4 rounded-3xl border border-slate-800 shadow-2xl relative w-full max-w-4xl max-h-screen overflow-hidden">
      
      {/* Top statistics layout */}
      <div className="w-full grid grid-cols-3 gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl mb-3 text-white">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-teal-400 shrink-0" />
          <div className="leading-tight">
            <div className="text-[10px] text-slate-400 font-mono">配置积分</div>
            <div className="text-xs font-bold text-teal-300 font-mono">{betPoints} 分 Pro</div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="text-[10px] text-slate-400 font-mono">剩余发射数</div>
          <div className="flex gap-1.5 mt-1">
            {Array.from({ length: dartCount }).map((_, idx) => (
              <span 
                key={idx}
                className={`w-2.5 h-2.5 rounded-full border transition-all ${
                  idx < dartsRemaining 
                    ? 'bg-teal-550 border-teal-400 animate-pulse bg-emerald-500 border-emerald-400' 
                    : 'bg-slate-800 border-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 text-right">
          <div>
            <div className="text-[10px] text-slate-400 font-mono">倒计时</div>
            <div className={`text-sm font-bold font-mono ${timeLeft <= 5 ? 'text-rose-500 animate-bounce' : 'text-emerald-400'}`}>
              {timeLeft}s
            </div>
          </div>
          <button
            onClick={handleToggleSound}
            className="p-1 px-2 text-[10px] rounded bg-slate-800 hover:bg-slate-700 transition font-bold text-teal-300"
          >
            {soundEnabled ? '声开' : '静音'}
          </button>
        </div>
      </div>

      {/* Main Touch-Sensitive Canvas container */}
      <div className="relative border border-slate-800 rounded-3xl overflow-hidden bg-slate-900 shadow-inner flex justify-center items-center cursor-crosshair">
        
        <canvas
          ref={canvasRef}
          width={800}
          height={560}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          className="w-full h-auto aspect-[800/560] max-h-[58vh] bg-slate-900 touch-none select-none"
        />

        {/* Guidance and aiming indicators overlay */}
        <div className="absolute right-4 bottom-4 flex flex-col gap-1 text-[11px] text-slate-400 font-mono bg-black/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 max-w-[280px] pointer-events-none">
          <div className="flex items-center gap-1 text-teal-400 font-bold">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400 animate-pulse" />
            <span>2D 核心瞄准投掷 🎯</span>
          </div>
          <p className="leading-relaxed">
            1. 在画布上<span className="text-white font-bold">点击或拖拽</span>以对准圆心大转盘。<br />
            2. 推动下方<span className="text-white font-bold">力度调节滑杆</span>调节推进力，初速度更大、受重力下落更微弱。<br />
            3. 点击下方<span className="text-white font-bold">确认发射飞镖</span>即刻射出！
          </p>
        </div>

        {/* Live angle badge */}
        <div className="absolute left-4 top-4 bg-black/60 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 font-mono">
          角度: <span className="text-teal-455 text-teal-400 font-bold">{Math.round(joystickAngle)}°</span>
        </div>
      </div>

      {/* Force Drag Slider Section */}
      <div className="w-full bg-slate-900 border border-slate-800 p-3 rounded-2xl mt-3 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-sans flex items-center gap-1">
            <Flame className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="font-bold text-slate-200">发射力度调节滑块 (Launch Power)</span>
          </span>
          <span className="font-mono text-teal-400 font-black text-xs bg-black/40 px-2 py-0.5 rounded border border-slate-850">
            {launchPower.toFixed(1)} 力度
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-500 font-mono">轻柔 (6.0)</span>
          <input
            type="range"
            min={MIN_POWER}
            max={MAX_POWER}
            step="0.5"
            value={launchPower}
            onChange={(e) => {
              setLaunchPower(Number(e.target.value));
              sound.playTick();
            }}
            disabled={activeDartRef.current !== null}
            className="flex-1 accent-teal-400 bg-slate-950 h-2 rounded-lg cursor-pointer max-w-full outline-none border border-slate-800"
          />
          <span className="text-[10px] font-bold text-slate-500 font-mono">极速 (24.0)</span>
        </div>
        
        <div className="text-[10px] text-slate-400 leading-normal">
          💡 <span className="text-teal-300 font-bold">重力抛物线规则：</span>力度极速时飞镖会近乎直线飞跃；轻柔时重力有更多时间拉坠飞镖。
        </div>
      </div>

      {/* Dynamic guidance console */}
      <div className="w-full flex flex-col md:flex-row items-center gap-3 mt-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-900">
        
        {/* Simple prompt logs */}
        <div className="flex-1 bg-black/40 px-3 py-2.5 rounded-xl border border-slate-950 text-xs text-teal-100 font-mono min-h-[42px] flex items-center">
          <Target className="w-4 h-4 text-teal-400 mr-2 shrink-0" />
          <span>{launchMessage}</span>
        </div>

        {/* Quick Launch and exit choices */}
        <div className="flex gap-2 shrink-0 w-full md:w-auto">
          <button
            onClick={onExit}
            className="flex-1 md:flex-none py-2.5 px-4 font-bold rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-755 text-slate-200 font-sans text-xs active:scale-95 transition pointer-events-auto"
          >
            返回
          </button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={dartsRemaining <= 0 || activeDartRef.current !== null}
            onClick={() => triggerLaunchWithPower(launchPower)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 py-2.5 px-8 rounded-xl shadow-lg transition-all text-xs text-white select-none ${
              dartsRemaining <= 0 || activeDartRef.current !== null
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-teal-500 via-emerald-600 to-cyan-600 hover:brightness-110 shadow-emerald-500/20 shadow-md cursor-pointer font-black uppercase'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>确认发射飞镖</span>
          </motion.button>
        </div>

      </div>

    </div>
  );
}
