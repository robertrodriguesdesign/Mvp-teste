import React from 'react';

interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const colors = [
  'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-red-500', 'bg-yellow-500',
];

function getColor(initials: string) {
  const idx = initials.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function Avatar({ initials, size = 'md', color, className = '' }: AvatarProps) {
  const bg = color || getColor(initials);
  return (
    <div className={`${sizes[size]} ${bg} text-white font-bold rounded-full flex items-center justify-center flex-shrink-0 ${className}`}>
      {initials.slice(0, 2)}
    </div>
  );
}
