import { useMemo, useState } from 'react';
import '../styles/components/EditCategoryModal.css';

function EditCategoryModal({ isOpen, category, onClose, onSave }) {
  const initialName = useMemo(() => category?.name ?? '', [category?.name]);

  const [categoryName, setCategoryName] = useState(() => initialName);

  const handleSubmit = () => {
    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      alert('Please enter a category name');
      return;
    }

    onSave({
      id: category?.id,
      name: trimmedName
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'edit-category-overlay') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-category-overlay" onClick={handleOverlayClick}>
      <div className="edit-category-modal" role="dialog" aria-modal="true" aria-label="Edit Category">
        <div className="modal-header">
          <h3>Edit Category</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="modal-content">
          <div className="form-group">
            <label>Category Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Standard"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-update" onClick={handleSubmit}>
            Update Category
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditCategoryModal;
