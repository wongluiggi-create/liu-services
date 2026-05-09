import { ReactNode, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#FFCC00] text-[#111111] hover:bg-[#E6B800]',
  secondary: 'bg-[#1C1C1C] border border-[#7F54F5]/30 text-gray-200 hover:bg-[#242424]',
  danger: 'bg-red-900/20 text-red-400 border border-red-800/30 hover:bg-red-900/30',
  ghost: 'bg-transparent text-gray-300 hover:bg-white/10',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-10 px-4 text-sm rounded-lg',
  lg: 'h-12 px-6 text-base rounded-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}
