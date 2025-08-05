import React from 'react';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Avatar: React.FC<AvatarProps> = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`inline-flex items-center justify-center rounded-full bg-gray-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`flex items-center justify-center text-sm font-medium text-gray-600 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};