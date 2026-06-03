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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <motion.div 
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 20 }}
        className={`bg-white rounded-[1.75rem] w-full ${maxWidth} max-h-[calc(100dvh-2.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden shadow-2xl border border-slate-200/40 m-2 sm:m-0`}
      >
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-100/85 flex justify-between items-center bg-white shrink-0">
          <div>
            <h2 className="font-sans font-black text-slate-900 text-base sm:text-lg tracking-tight uppercase leading-none">{title}</h2>
            <div className="h-1 w-10 bg-slate-900 mt-1.5 rounded-full"></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all active:scale-95 border border-transparent hover:border-rose-100/50">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${noPadding ? '' : 'px-5 pt-5 pb-16 sm:px-8 sm:pt-6 sm:pb-8'}`}>
          {children}
        </div>
      </motion.div>
    </div>
  );
};
