import React from 'react';
import './HextechModal.css';

const HextechModal = ({ isOpen, title, onClose, onConfirm, confirmText = "Confirm", type = "default", children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content card">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
        
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          {onConfirm && (
            <button 
              className={`btn-confirm ${type === 'danger' ? 'btn-danger' : 'btn-success'}`} 
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HextechModal;