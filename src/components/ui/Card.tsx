import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({ children, className = '', hover = false, onClick, padding = 'md' }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-gray-100 shadow-sm
        ${paddings[padding]}
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
