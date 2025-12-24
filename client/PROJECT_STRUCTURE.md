# Project Structure

## Overview
The project follows a clean separation between **pages** and **components**:
- **Pages**: Top-level views/screens that compose components
- **Components**: Reusable UI building blocks

## Directory Structure

```
src/
├── pages/                    # Page-level components
│   ├── index.js             # Page exports
│   ├── LoginPage.jsx        # Main login screen container
│   ├── LoginPage.css
│   ├── LoginForm.jsx        # Login form logic and state
│   └── LoginForm.css
│
├── components/              # Reusable components
│   ├── index.js            # Component exports
│   ├── Header.jsx          # App header with branding
│   ├── Header.css
│   ├── LoginCard.jsx       # Card wrapper with tabs
│   ├── LoginCard.css
│   ├── TabButtons.jsx      # Tab navigation
│   ├── TabButtons.css
│   ├── FormHeader.jsx      # Form title and icon
│   ├── FormHeader.css
│   ├── Input.jsx           # Reusable text input
│   ├── Input.css
│   ├── PasswordInput.jsx   # Password input with toggle
│   ├── PasswordInput.css
│   ├── Button.jsx          # Primary button
│   ├── Button.css
│   ├── Footer.jsx          # App footer
│   └── Footer.css
│
├── App.jsx                 # Root application component
├── App.css
├── index.css               # Global styles
└── main.jsx               # Application entry point
```

## Pages vs Components

### Pages (`src/pages/`)
Pages are complete views that represent a route or screen in your application.

#### LoginPage
- **Purpose**: Main container for the entire login screen
- **Imports**: Components from `../components`
- **Exports**: Default export for routing
- **State**: None (delegates to child components)

#### LoginForm
- **Purpose**: Form logic and state management
- **Imports**: Components from `../components`
- **State**: 
  - `username`: User's username input
  - `password`: User's password input
- **Features**:
  - Form submission handling
  - Forgot password functionality
  - Input validation (ready for implementation)

### Components (`src/components/`)
Reusable UI elements that can be used across multiple pages.

All components are:
- Self-contained with their own styles
- Reusable across the application
- Focused on a single responsibility
- Documented with clear props

## Import Examples

### Importing Pages
```jsx
// From App.jsx or router
import LoginPage from './pages/LoginPage';
// OR
import { LoginPage, LoginForm } from './pages';
```

### Importing Components
```jsx
// Individual imports
import Header from '../components/Header';
import Button from '../components/Button';

// OR using barrel exports
import { Header, Button, Input } from '../components';
```

## Component Hierarchy

```
App
└── LoginPage (PAGE)
    ├── Header (Component)
    ├── LoginCard (Component)
    │   ├── TabButtons (Component)
    │   └── LoginForm (PAGE)
    │       ├── FormHeader (Component)
    │       ├── Input (Component)
    │       ├── PasswordInput (Component)
    │       └── Button (Component)
    └── Footer (Component)
```

## Styling Architecture

Each component/page has its own CSS file:
- `ComponentName.jsx` → `ComponentName.css`
- Co-located for better maintainability
- No global namespace pollution
- Easy to find and modify styles

### Global Styles
- `index.css`: Global resets, fonts, body styles
- `App.css`: App-level styles (currently minimal)

## Key Features

### Password Input
The password field includes:
- Toggle visibility functionality
- Eye icon that changes state
- Proper CSS specificity with `!important` for padding
- Hover effects on toggle button

### State Management
- Form state is managed in `LoginForm` (page level)
- Tab state is managed in `LoginCard` (component level)
- Following React best practices for controlled components

## Best Practices Applied

1. **Separation of Concerns**: Pages handle logic, components handle UI
2. **Single Responsibility**: Each component does one thing well
3. **Reusability**: Components can be used in multiple pages
4. **Maintainability**: Clear structure makes it easy to find and modify code
5. **Scalability**: Easy to add new pages and components

## Adding New Pages

1. Create new page file in `src/pages/`
2. Create corresponding CSS file
3. Add export to `src/pages/index.js`
4. Import components from `../components`

## Adding New Components

1. Create new component file in `src/components/`
2. Create corresponding CSS file
3. Add export to `src/components/index.js`
4. Use component in pages with `import { ComponentName } from '../components'`

## Future Enhancements

- Add routing (React Router)
- Add more pages (Dashboard, Settings, etc.)
- Add more reusable components (Modal, Alert, etc.)
- Add form validation library
- Add state management (Redux, Zustand, etc.)
- Add API integration
