import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  className = '', 
  ...props 
}: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-900/10",
    secondary: "bg-white text-slate-900 border border-slate-200 hover:border-slate-900 hover:bg-slate-50 shadow-sm",
    ghost: "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50",
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/10",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/10"
  };

  const sizes = {
    sm: "h-9 px-4 rounded-xl text-[10px]",
    md: "h-12 px-6 rounded-2xl text-[11px]",
    lg: "h-14 px-8 rounded-2xl text-[12px]",
    icon: "h-11 w-11 rounded-xl p-0"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : children}
    </button>
  );
};
