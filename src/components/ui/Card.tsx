import React from 'react';
import { motion } from 'motion/react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export const Card = ({ children, className = "", ...props }: CardProps) => (
  <div 
    className={`bg-white rounded-[2rem] p-5 sm:p-6 border border-slate-200/60 hover:border-slate-900/10 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-slate-900/5 ${className}`}
    style={{ opacity: 1, visibility: 'visible' }}
    {...props}
  >
    {children}
  </div>
);
