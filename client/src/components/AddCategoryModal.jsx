import { useState } from 'react';
import '../styles/components/AddCategoryModal.css';

function AddCategoryModal({ isOpen, onClose, onSave }) {
  const [categoryName, setCategoryName] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      alert('Please enter a category name');
      return;
    }

    if (price === '' || Number.isNaN(Number(price))) {
      alert('Please enter a valid price');
      return;
    }

    const payload = {
      name: trimmedName,
      // Backend currently ignores price; included for future compatibility.
      price: Number(price)
    };

    try {
      setIsSubmitting(true);
      await onSave(payload);
      setCategoryName('');
      setPrice('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target?.classList?.contains('add-category-overlay')) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="add-category-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown} role="presentation" tabIndex={-1}>
      <div className="add-category-modal" role="dialog" aria-modal="true" aria-label="Add Category">
        <div className="modal-header">
          <h3>Add Category</h3>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-content">
          <div className="form-group">
            <label>Category Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Premium, VIP, Standard..."
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Price</label>
            <div className="price-input-wrapper">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                className="form-input price-input"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button 
            className="btn-create" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            Create Category
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCategoryModal;
