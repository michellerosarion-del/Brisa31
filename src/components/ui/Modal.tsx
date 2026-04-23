import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  noPadding?: boolean;
}

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-2xl', 
  noPadding = false 
}: ModalProps) => {
  if (!isOpen) return null;
  
  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <motion.div 
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`bg-white rounded-xl w-full ${maxWidth} overflow-hidden shadow-2xl border border-slate-200`}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-sans font-bold text-slate-800 text-lg tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-all active:scale-90">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className={`${noPadding ? '' : 'p-6'} max-h-[80vh] overflow-y-auto custom-scrollbar`}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};
