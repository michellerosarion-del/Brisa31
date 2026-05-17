import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = ({ label, error, icon, className = '', ...props }: InputProps) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors">
            {icon}
          </div>
        )}
        <input 
          className={`
            w-full bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none 
            focus:border-slate-900 focus:bg-white transition-all placeholder:text-slate-400 uppercase tracking-tight
            ${icon ? 'pl-12 pr-5' : 'px-5'}
            ${label ? 'h-12' : 'h-11'}
            ${error ? 'border-rose-500 focus:border-rose-500' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1">
          {error}
        </span>
      )}
    </div>
  );
};
