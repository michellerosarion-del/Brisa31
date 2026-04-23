import React from 'react';
import { motion } from 'motion/react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export const Card = ({ children, className = "", ...props }: CardProps) => (
  <div 
    className={`bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:border-blue-200 transition-all duration-200 ${className}`}
    style={{ opacity: 1, visibility: 'visible' }}
    {...props}
  >
    {children}
  </div>
);
