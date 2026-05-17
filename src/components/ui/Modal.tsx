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
        initial={{ opacity: 0, scale: 0.98, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 30 }}
        className={`bg-white rounded-[2.5rem] w-full ${maxWidth} overflow-hidden shadow-2xl border border-slate-200/50 m-2 sm:m-0`}
      >
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="font-sans font-black text-slate-900 text-lg sm:text-xl tracking-tight uppercase">{title}</h2>
            <div className="h-1 w-12 bg-slate-900 mt-2 rounded-full"></div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-rose-100">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className={`${noPadding ? '' : 'p-6 sm:p-10'} max-h-[90vh] overflow-y-auto custom-scrollbar`}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};
