import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  className = '', 
  children, 
  disabled, 
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-brand-500',
    ghost: 'hover:bg-gray-100 text-gray-600 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
};
