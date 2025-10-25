import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", isDestructive = true }) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose} // Close on backdrop click
    >
      <div
        className={`w-full max-w-md p-6 rounded-2xl bg-glass border border-border shadow-xl z-50`}
        onClick={(e) => e.stopPropagation()} // Prevent click-through
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {isDestructive && <AlertTriangle className="text-red-500" size={20} />}
            {title || 'Confirm Action'}
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10`}
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-text-secondary mb-6">{message || 'Are you sure you want to proceed?'}</p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-medium ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary text-primary-text primary-hover'
            } transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
