import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  color?: 'purple' | 'green' | 'blue' | 'yellow' | 'orange';
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const colors = {
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
};

export function ProgressBar({ value, color = 'purple', size = 'sm', showLabel = false, className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={className}>
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors[color]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-500 mt-1 text-right">{clamped}%</p>
      )}
    </div>
  );
}
