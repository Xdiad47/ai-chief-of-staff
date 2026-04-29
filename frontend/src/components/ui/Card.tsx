import React from 'react';

interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, padding = 'md', className = '' }) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
};
