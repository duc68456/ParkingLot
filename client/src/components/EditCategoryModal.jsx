import { useMemo, useState } from 'react';
import '../styles/components/EditCategoryModal.css';

function normalizePriceToNumber(price) {
  if (price === null || price === undefined) return '';
  if (typeof price === 'number') return Number.isFinite(price) ? String(price) : '';
  if (typeof price !== 'string') return '';

  // Supports "$10.00", "10", "10.00"
  const cleaned = price.replace(/[^0-9.]/g, '');
  return cleaned;
}

function EditCategoryModal({ category, onClose, onUpdate }) {
  const initialName = useMemo(() => category?.name ?? '', [category?.name]);
  const initialPrice = useMemo(() => normalizePriceToNumber(category?.price), [category?.price]);

  const [categoryName, setCategoryName] = useState(() => initialName);
  const [price, setPrice] = useState(() => initialPrice);

  const handleSubmit = () => {
    const trimmedName = categoryName.trim();

    if (!trimmedName || price === '' || Number.isNaN(Number(price))) {
      alert('Please fill in all fields');
      return;
    }

    onUpdate({
      id: category?.id,
      name: trimmedName,
      price: parseFloat(price)
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'edit-category-overlay') {
      onClose();
    }
  };

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

          <div className="form-group">
            <label>Price</label>
            <div className="price-input-wrapper">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                className="form-input price-input"
                placeholder="10"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
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
