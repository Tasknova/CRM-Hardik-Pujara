import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  animated?: boolean;
  accentColor?: string; // e.g. 'border-blue-500'
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'md',
  hover = false,
  animated = false,
  accentColor
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  const animationClass = animated ? 'animate-fade-in-up' : '';
  const accentClass = accentColor ? `border-l-4 ${accentColor}` : '';

  return (
    <div 
      className={`
        bg-white rounded-xl shadow-sm border border-gray-200
        ${paddingClasses[padding]}
        ${hover ? 'hover:shadow-lg hover:-translate-y-1 transition-all duration-200' : ''}
        ${animationClass}
        ${accentClass}
        ${className}
      `}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

export default Card;

// Add animation to global CSS if not present:
// .animate-fade-in-up { @apply opacity-0 translate-y-4; animation: fadeInUp 0.4s forwards; }
// @keyframes fadeInUp { to { opacity: 1; transform: none; } }