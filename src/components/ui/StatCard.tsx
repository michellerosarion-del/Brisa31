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
  <Card className="p-5 flex flex-col gap-4 group min-h-[120px] justify-between border-slate-100 hover:border-slate-200 transition-all duration-300 shadow-sm">
    <div className="flex items-start justify-between">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass.replace('text-', 'bg-').replace('-600', '-50')} border ${colorClass.replace('text-', 'border-').replace('-600', '-100')} transition-colors duration-300`}>
        <div className={`${colorClass}`}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg ${trend > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
          <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )}
    </div>

    <div className="space-y-0.5">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
        {title}
      </p>
      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
        {value}
      </h3>
    </div>
  </Card>
);
