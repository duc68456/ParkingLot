# Login Page - Component Architecture

## Overview
This login page implements a component-based architecture following React best practices. The design is based on the Figma mockup and features a clean, modern interface with tab-based navigation for Staff and Admin login.

## Component Structure

```
LoginPage (Main Container)
├── Header
│   ├── Company Logo Icon
│   ├── Title: "Company Portal"
│   └── Subtitle: "Secure Access System"
├── LoginCard
│   ├── TabButtons
│   │   ├── Staff Login Tab
│   │   └── Admin Login Tab
│   └── LoginForm
│       ├── FormHeader
│       │   ├── Login Icon
│       │   ├── Title: "Login"
│       │   └── Subtitle: "Enter your credentials"
│       ├── Input (Username)
│       ├── PasswordInput (Password with toggle)
│       ├── Button (Login)
│       └── Forgot Password Link
└── Footer
    └── Copyright Notice
```

## Components

### 1. **LoginPage** (`LoginPage.jsx`)
- **Purpose**: Main container component that orchestrates the entire login screen
- **Responsibilities**: Layout management, background styling
- **State**: None (stateless)
- **Children**: Header, LoginCard, Footer

### 2. **Header** (`Header.jsx`)
- **Purpose**: Displays the company branding and page title
- **Responsibilities**: Shows company logo, portal name, and tagline
- **State**: None (stateless)
- **Props**: None

### 3. **LoginCard** (`LoginCard.jsx`)
- **Purpose**: Container for the login interface card
- **Responsibilities**: Manages tab state, displays tab buttons and login form
- **State**: 
  - `activeTab`: Tracks which tab is selected ('staff' or 'admin')
- **Children**: TabButtons, LoginForm

### 4. **TabButtons** (`TabButtons.jsx`)
- **Purpose**: Tab navigation for Staff/Admin login
- **Responsibilities**: Displays tabs and handles tab switching
- **Props**:
  - `activeTab`: Current active tab
  - `onTabChange`: Callback to change tabs
- **State**: None (controlled component)

### 5. **LoginForm** (`LoginForm.jsx`)
- **Purpose**: Main form container for login functionality
- **Responsibilities**: Handles form submission, manages form state
- **Props**:
  - `type`: Login type ('staff' or 'admin')
- **State**:
  - `username`: Username input value
  - `password`: Password input value
- **Children**: FormHeader, Input, PasswordInput, Button

### 6. **FormHeader** (`FormHeader.jsx`)
- **Purpose**: Displays the form title and icon
- **Responsibilities**: Shows the login icon and descriptive text
- **State**: None (stateless)
- **Props**: None

### 7. **Input** (`Input.jsx`)
- **Purpose**: Reusable text input component
- **Responsibilities**: Displays labeled input field
- **Props**:
  - `label`: Input label text
  - `type`: Input type (text, email, etc.)
  - `placeholder`: Placeholder text
  - `value`: Input value
  - `onChange`: Change handler
- **State**: None (controlled component)

### 8. **PasswordInput** (`PasswordInput.jsx`)
- **Purpose**: Specialized password input with visibility toggle
- **Responsibilities**: Handles password input with show/hide functionality
- **Props**:
  - `label`: Input label text
  - `placeholder`: Placeholder text
  - `value`: Password value
  - `onChange`: Change handler
- **State**:
  - `showPassword`: Boolean to toggle password visibility

### 9. **Button** (`Button.jsx`)
- **Purpose**: Reusable primary button component
- **Responsibilities**: Displays styled button for actions
- **Props**:
  - `children`: Button text content
  - `type`: Button type (button, submit, reset)
  - `onClick`: Click handler
- **State**: None

### 10. **Footer** (`Footer.jsx`)
- **Purpose**: Displays copyright and footer information
- **Responsibilities**: Shows copyright text with dynamic year
- **State**: None (stateless)
- **Props**: None

## Design Principles

### 1. **Single Responsibility**
Each component has a clear, focused purpose:
- UI components (Header, Footer) only handle display
- Form components (LoginForm) manage form logic
- Input components are reusable and controlled

### 2. **Composition over Inheritance**
Components are composed together to build the interface:
- LoginPage composes Header, LoginCard, and Footer
- LoginCard composes TabButtons and LoginForm
- LoginForm composes multiple Input components

### 3. **Reusability**
Generic components can be reused across the application:
- `Input`: Can be used for any text input
- `Button`: Can be used for any primary action
- `PasswordInput`: Can be used wherever password input is needed

### 4. **Separation of Concerns**
- **Presentation**: Each component has its own CSS file
- **Logic**: Form state and handlers are in LoginForm
- **Data Flow**: Props flow down, events flow up (unidirectional data flow)

### 5. **Controlled Components**
Form inputs are controlled components:
- State is managed by parent (LoginForm)
- Input values are passed as props
- Changes are handled through callbacks

## Styling Architecture

### CSS Organization
- Each component has its own CSS file
- Global styles in `index.css`
- No CSS conflicts due to component-scoped styles

### Design Tokens (from Figma)
- **Primary Color**: #155dfc (buttons, active states)
- **Text Colors**: 
  - Primary: #1d293d
  - Secondary: #45556c, #62748e
  - Tertiary: #314158
- **Border Colors**: #cad5e2, #e2e8f0
- **Background**: Linear gradient (rgb(239, 246, 255) to rgb(241, 245, 249))
- **Fonts**: Arimo (400 weight)
- **Border Radius**: 10px (inputs/buttons), 16px (card), 50% (icons)
- **Shadows**: Multiple levels for depth

## State Management

### Current State Flow
```
LoginCard (activeTab state)
    ↓ (prop)
TabButtons (receives activeTab, calls onTabChange)
    ↓ (updates)
LoginCard (updates activeTab)

LoginForm (username, password state)
    ↓ (props)
Input / PasswordInput (receives value, calls onChange)
    ↓ (updates)
LoginForm (updates state)
```

### Future Enhancements
- Add form validation state
- Add loading states for async operations
- Add error message display
- Integrate with authentication API
- Add remember me functionality

## Usage

```jsx
import LoginPage from './components/LoginPage';

function App() {
  return <LoginPage />;
}
```

## File Structure
```
src/
├── App.jsx
├── App.css
├── index.css
├── main.jsx
└── components/
    ├── LoginPage.jsx
    ├── LoginPage.css
    ├── Header.jsx
    ├── Header.css
    ├── LoginCard.jsx
    ├── LoginCard.css
    ├── TabButtons.jsx
    ├── TabButtons.css
    ├── LoginForm.jsx
    ├── LoginForm.css
    ├── FormHeader.jsx
    ├── FormHeader.css
    ├── Input.jsx
    ├── Input.css
    ├── PasswordInput.jsx
    ├── PasswordInput.css
    ├── Button.jsx
    ├── Button.css
    ├── Footer.jsx
    └── Footer.css
```

## Features Implemented

✅ Tab navigation between Staff and Admin login  
✅ Responsive design  
✅ Password visibility toggle  
✅ Form validation ready (structure in place)  
✅ Accessible form inputs with labels  
✅ Hover and focus states  
✅ Clean component architecture  
✅ Reusable components  

## Next Steps

- Add form validation logic
- Connect to authentication API
- Add error handling and display
- Add loading states
- Add animations/transitions
- Add forgot password flow
- Add tests for components
- Add PropTypes or TypeScript for type safety
