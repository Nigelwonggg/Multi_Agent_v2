import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>
          <FiX size={20} />
        </button>
        
        <div className="modal-header">
          <div className={`modal-icon-container ${isDestructive ? 'destructive' : ''}`}>
            <FiAlertTriangle size={32} />
          </div>
          <h2>{title}</h2>
        </div>
        
        <div className="modal-body">
          <p>{message}</p>
        </div>
        
        <div className="modal-footer">
          <button className="modal-btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button 
            className={`modal-btn-primary ${isDestructive ? 'destructive' : ''}`} 
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
