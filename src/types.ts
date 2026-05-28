/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ColorRatio {
  name: string;
  color: string;
  key: string;
  percentage: number;
  multiplier: number;
  label: string;
}

export interface GameSettings {
  betPoints: number;
  dartCount: number;
}

export interface DartHit {
  id: string;
  colorKey: string;
  colorName: string;
  colorHex: string;
  multiplier: number;
  pointsEarned: number;
  hitAngle: number; // local angle on spinning wheel
  hitRadius: number; // distance from wheel center
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  life: number;
}

export interface WheelSegment {
  key: string;
  name: string;
  color: string;
  percentage: number;
  multiplier: number;
}

// Helper to determine percentages from bet points
export function calculateRatios(betPoints: number): ColorRatio[] {
  // Enforce range constraints 1000 - 20000
  const points = Math.max(1000, Math.min(20000, betPoints));

  // 1. Red Percent (P_red):
  // 10000 to 20000 -> 0% to 5%
  let pRed = 0;
  if (points >= 10000) {
    pRed = 5 * ((points - 10000) / 10000);
  }

  // 2. Orange Percent (P_orange):
  // 5000 to 20000 -> 0% to 10%
  let pOrange = 0;
  if (points > 5000) {
    pOrange = 10 * ((points - 5000) / 15000);
  }

  // 3. Purple Percent (P_purple):
  // 1000 to 20000 -> 5% to 10%
  const pPurple = 5 + 5 * ((points - 1000) / 19000);

  // 4. Blue Percent (P_blue):
  // 1000 to 20000 -> 10% to 15%
  const pBlue = 10 + 5 * ((points - 1000) / 19000);

  // 5. Green Percent (P_green):
  // 1000 to 20000 -> 20% to 25%
  const pGreen = 20 + 5 * ((points - 1000) / 19000);

  // 6. White Percent (P_white):
  // Fills the remainder
  const pWhite = Math.max(0, 100 - (pGreen + pBlue + pPurple + pOrange + pRed));

  // Rounded values to 2 decimal points for smoother slider matching
  const rWhite = Math.round(pWhite * 100) / 100;
  const rGreen = Math.round(pGreen * 100) / 100;
  const rBlue = Math.round(pBlue * 100) / 100;
  const rPurple = Math.round(pPurple * 100) / 100;
  const rOrange = Math.round(pOrange * 105) / 100; // soft correction
  const rRed = Math.round(pRed * 100) / 100;

  // Let's adjust to exactly sum to 100% due to floating round-offs
  const sum = rWhite + rGreen + rBlue + rPurple + rOrange + rRed;
  const diff = Math.round((100 - sum) * 100) / 100;
  
  // Apply diff to white
  const finalWhite = Math.max(0, Math.round((rWhite + diff) * 100) / 100);

  return [
    { name: '白色区域', key: 'white', color: '#F3F4F6', percentage: finalWhite, multiplier: 0.5, label: '普通倍率' },
    { name: '绿色区域', key: 'green', color: '#10B981', percentage: rGreen, multiplier: 1.5, label: '进阶倍率' },
    { name: '蓝色区域', key: 'blue', color: '#3B82F6', percentage: rBlue, multiplier: 3.0, label: '中级倍率' },
    { name: '紫色区域', key: 'purple', color: '#8B5CF6', percentage: rPurple, multiplier: 5.0, label: '高级倍率' },
    { name: '橙色区域', key: 'orange', color: '#F59E0B', percentage: rOrange, multiplier: 10.0, label: '稀有爆倍' },
    { name: '红色区域', key: 'red', color: '#EF4444', percentage: rRed, multiplier: 25.0, label: '至尊大奖' },
  ];
}

// Dynamic segment generator to split and wrap colors into smaller shards alternates around 360 degrees
export function getSplitSegments(betPoints: number): WheelSegment[] {
  const baseRatios = calculateRatios(betPoints);
  const ratioMap = baseRatios.reduce((acc, current) => {
    acc[current.key] = current;
    return acc;
  }, {} as Record<string, ColorRatio>);

  const wPct = ratioMap['white']?.percentage || 0;
  const gPct = ratioMap['green']?.percentage || 0;
  const bPct = ratioMap['blue']?.percentage || 0;
  const pPct = ratioMap['purple']?.percentage || 0;
  const oPct = ratioMap['orange']?.percentage || 0;
  const rPct = ratioMap['red']?.percentage || 0;

  // We split:
  // - White into 4 pieces
  // - Green into 3 pieces
  // - Blue into 2 pieces
  // - Purple into 2 pieces
  // - Orange into 2 pieces
  // - Red into 1 or 2 pieces
  
  // Build pieces
  const pieces = [
    { key: 'white', name: '白色区域', color: '#F3F4F6', percentage: wPct * 0.25, multiplier: 0.5 },
    { key: 'green', name: '绿色区域', color: '#10B981', percentage: gPct * 0.35, multiplier: 1.5 },
    { key: 'blue', name: '蓝色区域', color: '#3B82F6', percentage: bPct * 0.5, multiplier: 3.0 },
    { key: 'purple', name: '紫色区域', color: '#8B5CF6', percentage: pPct * 0.5, multiplier: 5.0 },
    { key: 'orange', name: '橙色区域', color: '#F59E0B', percentage: oPct * 0.5, multiplier: 10.0 },
    { key: 'red', name: '红色区域', color: '#EF4444', percentage: rPct * 0.6, multiplier: 25.0 },

    { key: 'white', name: '白色区域', color: '#F3F4F6', percentage: wPct * 0.25, multiplier: 0.5 },
    { key: 'green', name: '绿色区域', color: '#10B981', percentage: gPct * 0.35, multiplier: 1.5 },
    { key: 'blue', name: '蓝色区域', color: '#3B82F6', percentage: bPct * 0.5, multiplier: 3.0 },
    { key: 'purple', name: '紫色区域', color: '#8B5CF6', percentage: pPct * 0.5, multiplier: 5.0 },
    { key: 'orange', name: '橙色区域', color: '#F59E0B', percentage: oPct * 0.5, multiplier: 10.0 },
    { key: 'red', name: '红色区域', color: '#EF4444', percentage: rPct * 0.4, multiplier: 25.0 },

    { key: 'white', name: '白色区域', color: '#F3F4F6', percentage: wPct * 0.25, multiplier: 0.5 },
    { key: 'green', name: '绿色区域', color: '#10B981', percentage: gPct * 0.3, multiplier: 1.5 },
    { key: 'white', name: '白色区域', color: '#F3F4F6', percentage: wPct * 0.25, multiplier: 0.5 },
  ];

  // Return segments that actually have a percentage > 0.1% to avoid rendering empty lines
  const rawSegments = pieces.filter(p => p.percentage > 0.05);

  // Normalize percentages slightly to ensure absolute 100% sum
  const curSum = rawSegments.reduce((sum, s) => sum + s.percentage, 0);
  if (curSum > 0 && Math.abs(100 - curSum) > 0.01) {
    const factor = 100 / curSum;
    rawSegments.forEach(s => {
      s.percentage *= factor;
    });
  }

  return rawSegments;
}
