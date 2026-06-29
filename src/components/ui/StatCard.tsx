import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  trend?: number;
}

export const StatCard = ({ title, value, icon, colorClass, trend }: StatCardProps) => (
  <Card className="p-5 flex flex-col gap-3 group min-h-[110px] sm:min-h-[125px] justify-between border-slate-100 hover:border-slate-200 transition-all duration-500 shadow-sm">
    <div className="flex items-start justify-between">
      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center ${colorClass.replace('text-', 'bg-').replace('-600', '-50')} border ${colorClass.replace('text-', 'border-').replace('-600', '-100/50')} transition-all group-hover:scale-110 duration-500`}>
        <div className={`${colorClass}`}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5 sm:w-6 h-6' })}
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg ${trend > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
          <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
          <span>{trend > 0 ? '+' : ''}{trend.toFixed(1)}%</span>
        </div>
      )}
    </div>

    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] leading-none">
        {title}
      </p>
      <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter leading-none">
        {value}
      </h3>
    </div>
  </Card>
);
