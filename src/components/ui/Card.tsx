import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export default function Card({ children, className = '', noPadding = false, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[#7F54F5]/20 bg-[#1C1C1C] ${noPadding ? '' : 'p-6'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
