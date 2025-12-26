import { useState } from 'react';
import '../styles/components/SearchBar.css';

const searchIcon = "http://localhost:3845/assets/38e660c2c89b4d9e1fe6e4909c5ddaa96ff8b7d8.svg";

export default function SearchBar({ placeholder = 'Search...' }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Search query:', searchQuery);
    // Add search logic here
  };

  return (
    <form onSubmit={handleSearch} className="search-bar">
      <img src={searchIcon} alt="Search" className="search-icon" />
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </form>
  );
}
