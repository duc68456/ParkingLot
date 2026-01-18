import { useEffect, useState } from 'react';
import '../styles/components/DeleteCategoryModal.css';

export default function DeleteCategoryModal({ category, onClose, onConfirm }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Inactive');

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isUpdating) onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, isUpdating]);

  const categoryName = category?.name || category?.Name || 'this category';
  const categoryId = category?.CategoryID || category?.ID || category?.id || '—';
  const currentStatus = category?.status || (category?.IsActive ? 'Active' : 'Inactive');

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isUpdating) onClose?.();
  };

  const handleConfirm = async () => {
    setIsUpdating(true);
    try {
      await onConfirm?.(category, selectedStatus);
      onClose?.();
    } catch (error) {
      console.error('Update category status error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="delete-category-modal-overlay" onClick={handleOverlayClick}>
      <div className="delete-category-modal" role="dialog" aria-modal="true" aria-labelledby="delete-category-title">
        <div className="delete-category-modal-header">
          <div className="delete-category-modal-title" id="delete-category-title">
            Update Category Status
          </div>
          <button
            className="delete-category-modal-close"
            onClick={onClose}
            disabled={isUpdating}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="delete-category-modal-body">
          <div className="delete-category-modal-subtitle">
            Update status for <strong>{categoryName}</strong>
          </div>

          <div className="delete-category-modal-item">
            <span className="delete-category-modal-item-label">ID:</span>
            <span className="delete-category-modal-item-value">{categoryId}</span>
          </div>

          <div className="delete-category-modal-item">
            <span className="delete-category-modal-item-label">Current Status:</span>
            <span className="delete-category-modal-item-value">{currentStatus}</span>
          </div>

          <div className="delete-category-modal-status-selection">
            <label className="delete-category-modal-status-label">
              Select New Status:
            </label>
            <div className="delete-category-modal-status-options">
              <label className="delete-category-modal-radio-option">
                <input
                  type="radio"
                  name="status"
                  value="Active"
                  checked={selectedStatus === 'Active'}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isUpdating}
                />
                <span className="delete-category-modal-radio-text">Active</span>
              </label>
              <label className="delete-category-modal-radio-option">
                <input
                  type="radio"
                  name="status"
                  value="Inactive"
                  checked={selectedStatus === 'Inactive'}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isUpdating}
                />
                <span className="delete-category-modal-radio-text">Inactive</span>
              </label>
            </div>
          </div>
        </div>

        <div className="delete-category-modal-actions">
          <button
            className="delete-category-modal-btn cancel"
            type="button"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            className="delete-category-modal-btn confirm"
            type="button"
            onClick={handleConfirm}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}
