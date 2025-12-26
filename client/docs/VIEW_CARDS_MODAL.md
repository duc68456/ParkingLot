# ViewCardsModal Component

## Overview
The `ViewCardsModal` component displays a modal showing all cards associated with a specific customer in the parking management system.

## Usage

### Basic Import
```jsx
import { ViewCardsModal } from '../components';
```

### Example Usage
```jsx
import { useState } from 'react';
import { ViewCardsModal } from '../components';

function CustomerTable() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerCards, setCustomerCards] = useState([]);
  const [showCardsModal, setShowCardsModal] = useState(false);

  const handleViewCards = (customer) => {
    setSelectedCustomer(customer);
    
    // Example cards data
    const cards = [
      {
        cardId: 'CARD001',
        uid: 'UID-123456',
        licensePlate: 'ABC-1234',
        vehicleType: 'Car',
        status: 'Active',
        expiryDate: '31/12/2025'
      },
      {
        cardId: 'CARD006',
        uid: 'UID-123461',
        status: 'Damaged',
        expiryDate: '15/08/2025'
      }
    ];
    
    setCustomerCards(cards);
    setShowCardsModal(true);
  };

  return (
    <>
      {/* Your table with customer data */}
      <button onClick={() => handleViewCards(customer)}>
        View Cards
      </button>

      {/* ViewCardsModal */}
      {showCardsModal && (
        <ViewCardsModal
          customer={selectedCustomer}
          cards={customerCards}
          onClose={() => setShowCardsModal(false)}
        />
      )}
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `customer` | Object | Yes | Customer object containing at least `name` property |
| `cards` | Array | Yes | Array of card objects to display |
| `onClose` | Function | Yes | Callback function when modal is closed |

### Customer Object Structure
```javascript
{
  name: 'John Doe',
  // other customer properties...
}
```

### Card Object Structure
```javascript
{
  cardId: 'CARD001',        // Required: Card identifier
  uid: 'UID-123456',        // Required: Card UID
  status: 'Active',         // Required: Card status (Active, Damaged, Inactive)
  expiryDate: '31/12/2025', // Required: Card expiry date
  licensePlate: 'ABC-1234', // Optional: Associated vehicle license plate
  vehicleType: 'Car'        // Optional: Type of vehicle (Car, Motorcycle, etc.)
}
```

## Features

- **Modal Overlay**: Click outside modal to close
- **Close Button**: X button in header to close modal
- **Card Status Badges**: Color-coded status indicators
  - Active (Green)
  - Damaged (Orange)
  - Inactive (Gray)
- **Vehicle Association**: Shows linked vehicle when available
- **Responsive Design**: Adapts to mobile screens
- **Scrollable Content**: Handles multiple cards gracefully

## Styling

The component uses scoped CSS classes prefixed with `view-cards-` to avoid conflicts. The styles are defined in:
- `src/styles/components/ViewCardsModal.css`

## Status Colors

- **Active**: Green background (#f0fdf4) with green text (#008236)
- **Damaged**: Orange background (#fff7ed) with orange text (#ca3500)
- **Inactive**: Gray background (#f8fafc) with gray text (#62748e)

## Notes

- The modal automatically centers on screen
- Clicking the overlay or close button calls the `onClose` callback
- The component returns `null` if `customer` or `cards` props are not provided
- Cards with `licensePlate` property will show a vehicle badge
