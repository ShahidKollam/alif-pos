import { Search } from 'lucide-react';

/**
 * Consistent page header: title | search (icon right) | filters | actions
 * Prevents search overlapping the page title.
 */
export default function PageToolbar({ title, search, onSearchChange, searchPlaceholder = 'Search…', children }) {
  return (
    <div className="page-toolbar">
      <h1>{title}</h1>
      {onSearchChange != null && (
        <div className="search-field">
          <input
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
          <Search size={15} className="search-ico" />
        </div>
      )}
      {children}
    </div>
  );
}
