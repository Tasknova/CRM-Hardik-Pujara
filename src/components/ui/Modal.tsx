import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md' 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        
        {/* Modal Content */}
        <div className={`relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-2xl transform transition-all duration-300 ease-out sm:my-8 sm:align-middle sm:w-full ${sizeClasses[size]} mx-auto ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              icon={X}
              className="hover:bg-gray-200"
            />
          </div>
          
          {/* Body */}
          <div className="p-6 bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;