/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { calculateRatios, ColorRatio, DartHit } from './types';
import SlotAd from './components/SlotAd';
import PhysicsGame from './components/PhysicsGame';
import { sound } from './utils/audio';
import { 
  Volume2, 
  VolumeX, 
  Target,
  Play,
  Flame,
  Sparkles,
  Award,
  List,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Input states — user points setting of the wheel
  const [betPoints, setBetPoints] = useState<number>(1000); // Default to 1000 according to user request
  const [dartCount, setDartCount] = useState<number>(1);    // Default to 1 dart according to user request
  
  // Game phases
  // "home" | "playing" | "results"
  const [gameState, setGameState] = useState<'home' | 'playing' | 'results'>('home');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Recent game landing hits
  const [lastGameHits, setLastGameHits] = useState<DartHit[]>([]);

  // Ratio calculator based on input bet points
  const activeRatios = calculateRatios(betPoints);

  const incrementBet = (amount: number) => {
    setBetPoints(prev => {
      const next = Math.min(20000, Math.max(1000, prev + amount));
      sound.playTick();
      return Math.round(next * 100) / 100; // Keep tidy decimals
    });
  };

  const handleStartGame = () => {
    sound.toggle(soundEnabled);
    sound.playShoot();
    setGameState('playing');
  };

  const handleGameEnd = (hits: DartHit[]) => {
    setLastGameHits(hits);
    setGameState('results');
  };

  // SVG representation for the spinning wheel layout preview
  const renderPieSvg = () => {
    let accumulatedAngle = 0;
    const size = 180;
    const radius = 80;
    const center = size / 2;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
        {activeRatios.map((ratio) => {
          const sliceAngle = (ratio.percentage / 100) * 360;
          if (sliceAngle <= 0) return null;

          const startRad = (accumulatedAngle * Math.PI) / 180;
          const endRad = ((accumulatedAngle + sliceAngle) * Math.PI) / 180;

          const x1 = center + radius * Math.cos(startRad);
          const y1 = center + radius * Math.sin(startRad);
          const x2 = center + radius * Math.cos(endRad);
          const y2 = center + radius * Math.sin(endRad);

          if (sliceAngle >= 359.9) {
            return (
              <circle
                key={ratio.key}
                cx={center}
                cy={center}
                r={radius}
                fill={ratio.color}
                stroke="#1E293B"
                strokeWidth="1.5"
                className="transition-all duration-300"
              />
            );
          }

          const largeArcFlag = sliceAngle > 180 ? 1 : 0;
          const pathData = [
            `M ${center} ${center}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');

          accumulatedAngle += sliceAngle;

          return (
            <path
              key={ratio.key}
              d={pathData}
              fill={ratio.color}
              stroke="#1E293B"
              strokeWidth="1.2"
              className="transition-all duration-300 hover:brightness-105"
            />
          );
        })}
        <circle cx={center} cy={center} r="14" fill="#EAB308" stroke="#FFFFFF" strokeWidth="1.5" />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-teal-500 selection:text-white relative">
      
      {/* Floating sponsorship links on left and right side gutters - rendered strictly on the Home dashboard screen */}
      {gameState === 'home' && (
        <>
          <SlotAd position="left" />
          <SlotAd position="right" />
        </>
      )}

      {/* Top Header Section */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-teal-400 via-emerald-500 to-cyan-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-500/10">
              <Target className="w-5 h-5 animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
                智力大转盘
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextVal = !soundEnabled;
                setSoundEnabled(nextVal);
                sound.toggle(nextVal);
              }}
              className="p-1 px-3.5 text-xs text-slate-400 font-mono rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 transition flex items-center gap-1"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-600" />}
              <span>{soundEnabled ? '声效开' : '静音'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 flex flex-col items-center justify-center z-10">
        
        <AnimatePresence mode="wait">
          {gameState === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
                
                {/* Visual decorations for design */}
                <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.08),transparent)] rounded-3xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 pointer-events-none bg-[radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.08),transparent)] rounded-3xl" />

                <div className="text-center mb-6 py-2">
                  <p className="text-sm font-semibold text-slate-200">
                    请在下方设置积分与飞镖，即可开启智力转盘物理投掷。
                  </p>
                </div>

                {/* Left Preview & Right Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 mb-6">
                  
                  {/* Wheel Interactive Visualization */}
                  <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 pb-5 md:pb-0 md:pr-6">
                    <span className="text-[11px] uppercase tracking-wider text-teal-300 font-extrabold mb-4 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5" />
                      大转盘预览
                    </span>
                    
                    <div className="w-36 h-36 relative animate-spin" style={{ animationDuration: '35s' }}>
                      {renderPieSvg()}
                    </div>
                  </div>

                  {/* Manual Data Forms Inputs */}
                  <div className="flex flex-col justify-center gap-5">
                    
                    {/* Bet point parameter inputs */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-yellow-400" />
                          <span>投注积分参数 (1000 - 20000)</span>
                        </label>
                        <span className="text-[10px] text-teal-400 font-semibold">支持键盘直接输入</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1000"
                          max="20000"
                          step="0.01"
                          value={betPoints}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setBetPoints(isNaN(val) ? 1000 : val);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm text-center outline-none transition"
                        />
                      </div>

                      {/* Micro Range Slider */}
                      <input
                        type="range"
                        min="1000"
                        max="20000"
                        step="1"
                        value={betPoints}
                        onChange={(e) => {
                          setBetPoints(parseFloat(e.target.value));
                          sound.playTick();
                        }}
                        className="w-full h-1.5 mt-3 appearance-none cursor-pointer bg-slate-800 accent-teal-500 rounded-full"
                      />

                      {/* Fast selection shortcuts buttons */}
                      <div className="grid grid-cols-4 gap-1 mt-2.5">
                        <button
                          onClick={() => incrementBet(-1500)}
                          className="py-1 text-[9px] bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 active:scale-95"
                        >
                          -1500
                        </button>
                        <button
                          onClick={() => incrementBet(1500)}
                          className="py-1 text-[9px] bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 active:scale-95"
                        >
                          +1500
                        </button>
                        <button
                          onClick={() => { setBetPoints(1000); sound.playTick(); }}
                          className="py-1 text-[9px] bg-slate-800 hover:bg-slate-750 text-teal-300 rounded-lg active:scale-95"
                        >
                          MIN (1k)
                        </button>
                        <button
                          onClick={() => { setBetPoints(20000); sound.playTick(); }}
                          className="py-1 text-[9px] bg-emerald-900/30 border border-emerald-500/25 text-emerald-100 rounded-lg hover:bg-emerald-800/40 active:scale-95"
                        >
                          MAX (20k)
                        </button>
                      </div>
                    </div>

                    {/* Dart Quantities manual input */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                          <List className="w-3.5 h-3.5 text-teal-400" />
                          <span>飞镖配备数量 (1 - 20 支)</span>
                        </label>
                      </div>

                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => { setDartCount(prev => Math.max(1, prev - 1)); sound.playTick(); }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 transition"
                        >
                          -
                        </button>
                        
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={dartCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setDartCount(isNaN(val) ? 1 : Math.max(1, Math.min(20, val)));
                          }}
                          className="flex-1 bg-slate-900 border border-slate-705 text-center font-mono font-bold text-sm py-1.5 rounded-xl text-white outline-none"
                        />

                        <button
                          onClick={() => { setDartCount(prev => Math.min(20, prev + 1)); sound.playTick(); }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 transition"
                        >
                          +
                        </button>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Accurate Multi-layered fractions reports */}
                <div className="space-y-2 mb-6">
                  <h4 className="text-xs text-teal-200 uppercase tracking-widest font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>各板块色料占比分配详情：</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeRatios.map((item) => (
                      <div 
                        key={item.key}
                        className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40 relative overflow-hidden group"
                      >
                        <div className="flex items-center gap-2 z-10">
                          <span className="w-2 rounded-full h-4 border border-black/30" style={{ backgroundColor: item.color }} />
                          <div>
                            <div className="text-xs font-black text-white">{item.name.replace('区域', '')}</div>
                            <div className="text-[9px] text-slate-500">{item.label}</div>
                          </div>
                        </div>
                        <div className="text-right z-10">
                          <div className="text-xs font-black text-teal-200 font-mono">{item.percentage}%</div>
                        </div>

                        {/* Minimum point lock status filters */}
                        {item.key === 'orange' && betPoints <= 5000 && (
                          <div className="absolute inset-0 bg-slate-950/95 flex items-center justify-center text-[9px] font-bold text-amber-500/80 backdrop-blur-xs">
                            🔒 积分 &gt; 5000 开放
                          </div>
                        )}
                        {item.key === 'red' && betPoints < 10000 && (
                          <div className="absolute inset-0 bg-slate-950/95 flex items-center justify-center text-[9px] font-bold text-rose-500/80 backdrop-blur-xs">
                            🔒 积分 &ge; 10000 开放
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartGame}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 font-black tracking-wide text-white bg-gradient-to-r from-teal-500 via-emerald-600 to-cyan-600 rounded-xl shadow-xl shadow-emerald-500/10 hover:brightness-110 active:brightness-95 transition-all text-sm uppercase cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>立即开始飞镖投射</span>
                  </motion.button>
                </div>

              </div>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full flex justify-center"
            >
              <PhysicsGame
                betPoints={betPoints}
                dartCount={dartCount}
                onGameEnd={handleGameEnd}
                onExit={() => setGameState('home')}
              />
            </motion.div>
          )}

          {gameState === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full max-w-lg mx-auto"
            >
              <div className="bg-slate-900 border border-teal-500/25 rounded-3xl p-6 shadow-2xl relative text-center text-white">
                
                <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl font-black text-white">本局投射统计报告</h3>
                <p className="text-xs text-slate-400 mt-1">配置设定：{betPoints} 积分比率 / 配备 {dartCount} 支飞镖</p>

                {/* Stenciled Hit items listing */}
                <div className="my-5 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {lastGameHits.length === 0 ? (
                    <div className="py-10 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-2xl">
                      😢 脱靶无归！未能捕获任何轮盘板块！
                    </div>
                  ) : (
                    lastGameHits.map((hit, idx) => (
                      <div 
                        key={hit.id} 
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-850"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-slate-800 text-slate-400 font-mono w-4.5 h-4.5 flex items-center justify-center rounded-full">
                            {idx + 1}
                          </span>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hit.colorHex }} />
                          <span className="text-xs font-bold text-slate-200">{hit.colorName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-emerald-400 font-medium">
                            已击中区域
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setGameState('home')}
                    className="flex-1 py-2.5 px-4 font-bold text-xs rounded-xl bg-slate-855 text-slate-300 hover:bg-slate-800 transition"
                  >
                    返回轮盘配置大厅
                  </button>
                  <button
                    onClick={() => setGameState('playing')}
                    className="flex-1 py-2.5 px-4 font-black text-xs rounded-xl text-white bg-gradient-to-r from-teal-500 to-cyan-600 shadow-lg shadow-emerald-500/10 hover:brightness-110 transition cursor-pointer"
                  >
                    按此条件再来一局
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Styled Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-4 text-center text-[10px] text-slate-600 font-mono">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            &copy; 2026 飞镖积分色粉轮盘物理模拟器. All Rights Reserved.
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-500">SYSTEM STABLE</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
