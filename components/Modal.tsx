import React, { ReactNode } from 'react';
import { XMarkIcon } from './icons/HeroIcons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-darkest bg-opacity-75 transition-opacity" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center sm:items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay, triggers close on click */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-neutral-darkest opacity-75"></div>
        </div>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div 
          className={`inline-block align-bottom bg-neutral-lightest dark:bg-neutral-dark rounded-lg text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} w-full`}
          // Prevent click inside modal from closing it
          onClick={(e) => e.stopPropagation()} 
        >
          <div className="px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-neutral-light dark:border-neutral-darkest">
                <h3 className="text-xl leading-6 font-semibold text-neutral-darkest dark:text-neutral-lightest" id="modal-title">
                    {title}
                </h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-neutral-DEFAULT hover:text-neutral-dark dark:text-neutral-light dark:hover:text-white rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-primary-DEFAULT"
                    aria-label="Close modal"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto pr-2"> {/* Added max-height and overflow for scrollable content */}
                 {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;