import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  };
}

export const ConfirmModal = ({ isOpen, onClose, config }: ConfirmModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
            config.type === 'danger' ? 'bg-rose-100 text-rose-600' : 
            config.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
            'bg-midnight/10 text-midnight'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-1">{config.title}</h3>
          <p className="text-base md:text-sm text-gray-500 font-medium leading-relaxed">{config.message}</p>
        </div>
        <div className="p-4 bg-gray-50 flex gap-2">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 md:py-2.5 rounded-xl md:rounded-lg font-bold text-gray-500 hover:bg-gray-200 transition-all text-base md:text-sm"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { config.onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-3 md:py-2.5 rounded-xl md:rounded-lg font-bold text-white transition-all shadow-lg text-base md:text-sm ${
              config.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' : 
              config.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 
              'bg-midnight hover:bg-midnight/90 shadow-midnight/10'
            }`}
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
