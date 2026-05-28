/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface SlotAdProps {
  position: 'left' | 'right';
}

export default function SlotAd({ position }: SlotAdProps) {
  // Ultra clean fixed container that stays absolutely out of the way, visible only on larger viewports (lg and up)
  const positionClasses = position === 'left' 
    ? 'fixed left-4 top-1/2 -translate-y-1/2' 
    : 'fixed right-4 top-1/2 -translate-y-1/2';

  return (
    <a
      href="https://slot.buaimoyu.cn"
      target="_blank"
      rel="noopener noreferrer"
      className={`${positionClasses} z-40 hidden lg:flex flex-col items-center gap-2 w-28 p-2.5 bg-black border border-slate-800 rounded-lg shadow-lg hover:border-slate-700 transition-all text-center select-none cursor-pointer`}
    >
      <div className="text-[11px] font-bold text-slate-300">
        智力老虎机
      </div>
      
      <div className="flex items-center justify-center gap-1 bg-slate-905 border border-slate-800 hover:bg-slate-800 text-slate-200 text-[10px] py-1 px-2 rounded w-full font-medium transition-colors">
        <span>进入</span>
        <ArrowRight className="w-2.5 h-2.5" />
      </div>
    </a>
  );
}

