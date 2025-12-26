import { useState } from 'react';
import '../styles/components/AddCategoryModal.css';

function AddCategoryModal({ onClose, onAdd }) {
  const [categoryName, setCategoryName] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = () => {
    if (!categoryName.trim() || !price) {
      alert('Please fill in all fields');
      return;
    }

    onAdd({
      name: categoryName,
      price: parseFloat(price)
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'add-category-overlay') {
      onClose();
    }
  };

  return (
    <div className="add-category-overlay" onClick={handleOverlayClick}>
      <div className="add-category-modal">
        <div className="modal-header">
          <h3>Add Category</h3>
          <button className="close-button" onClick={onClose}>
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
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-create" 
            onClick={handleSubmit}
          >
            Create Category
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCategoryModal;
