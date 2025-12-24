# PIN Input Component

## Overview
A specialized input component for entering PIN codes with automatic focus management and paste support.

## Features

✅ **Auto-focus**: Automatically focuses next input when a digit is entered
✅ **Backspace navigation**: Pressing backspace on empty field moves to previous field
✅ **Arrow key navigation**: Use arrow keys to move between inputs
✅ **Paste support**: Paste entire PIN code at once
✅ **Numeric only**: Only accepts numeric digits (0-9)
✅ **Visual feedback**: Highlights focused input with blue border
✅ **Accessibility**: Proper ARIA labels for screen readers

## Usage

```jsx
import { useState } from 'react';
import PinInput from '../components/PinInput';

function MyComponent() {
  const [pin, setPin] = useState(['', '', '', '', '', '']);

  return (
    <PinInput 
      length={6}
      value={pin}
      onChange={setPin}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `length` | number | `6` | Number of PIN digits (input boxes) |
| `value` | array | required | Array of strings representing each digit |
| `onChange` | function | required | Callback when PIN changes, receives new array |

## Behavior

### Input
- Only accepts single digits (0-9)
- Non-numeric characters are ignored
- Latest digit replaces previous if multiple keys pressed

### Navigation
- **Tab**: Standard tab navigation
- **Arrow Left**: Move to previous input
- **Arrow Right**: Move to next input
- **Backspace**: 
  - Clear current digit if filled
  - Move to previous input if empty

### Paste
- Paste full PIN code at once (only in first input)
- Extracts digits from pasted text
- Ignores non-numeric characters
- Fills inputs up to the length limit
- Auto-focuses last filled input

### Auto-focus
- First input focused on mount
- Next input focused when digit entered
- Previous input focused on backspace (when empty)

## Styling

The component uses CSS with these key classes:
- `.pin-input-container`: Flex container for all inputs
- `.pin-digit-input`: Individual input box styling

### Visual States
- **Default**: Gray border (#cad5e2)
- **Focus**: Blue border (#155dfc)
- **Filled**: Blue border (#155dfc)

## Example with Form Validation

```jsx
import { useState } from 'react';
import PinInput from '../components/PinInput';
import Button from '../components/Button';

function PinLoginForm() {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const isPinComplete = pin.every(digit => digit !== '');

  const handleSubmit = (e) => {
    e.preventDefault();
    const pinCode = pin.join('');
    console.log('PIN:', pinCode);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PinInput length={6} value={pin} onChange={setPin} />
      <Button 
        type="submit" 
        disabled={!isPinComplete}
        variant={isPinComplete ? 'primary' : 'disabled'}
      >
        Login
      </Button>
    </form>
  );
}
```

## Accessibility

- Each input has `aria-label` with position (e.g., "PIN digit 1")
- Uses `inputMode="numeric"` for mobile numeric keyboard
- Proper focus management for keyboard navigation
- Visual focus indicators

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers with numeric keyboard support
- Requires JavaScript enabled
