import React from 'react';
import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {

  const handleJump = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const page = parseInt(e.target.value, 10);
    onPageChange(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const pageLimit = 5; // Max number of page buttons to show
    const ellipsis = <li key="ellipsis" className="pagination-item ellipsis"><span>...</span></li>;

    if (totalPages <= pageLimit + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <li key={i} className={`pagination-item ${currentPage === i ? 'active' : ''}`}>
            <button onClick={() => onPageChange(i)}>{i}</button>
          </li>
        );
      }
    } else {
      // Always show first page
      pages.push(
        <li key={1} className={`pagination-item ${currentPage === 1 ? 'active' : ''}`}>
          <button onClick={() => onPageChange(1)}>1</button>
        </li>
      );

      // Ellipsis or pages after first page
      if (currentPage > 3) {
        pages.push(ellipsis);
      }

      // Pages around the current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(
          <li key={i} className={`pagination-item ${currentPage === i ? 'active' : ''}`}>
            <button onClick={() => onPageChange(i)}>{i}</button>
          </li>
        );
      }

      // Ellipsis or pages before last page
      if (currentPage < totalPages - 2) {
        pages.push(ellipsis);
      }

      // Always show last page
      pages.push(
        <li key={totalPages} className={`pagination-item ${currentPage === totalPages ? 'active' : ''}`}>
          <button onClick={() => onPageChange(totalPages)}>{totalPages}</button>
        </li>
      );
    }

    return pages;
  };

  return (
    <nav className="pagination-container" aria-label="Pagination">
      <button 
        className="pagination-item prev-btn" 
        onClick={() => onPageChange(currentPage - 1)} 
        disabled={currentPage === 1}
      >
        Previous
      </button>
      <ul className="pagination-list">
        {getPageNumbers()}
      </ul>
      <button 
        className="pagination-item next-btn" 
        onClick={() => onPageChange(currentPage + 1)} 
        disabled={currentPage === totalPages}
      >
        Next
      </button>
      <div className="pagination-jump">
        <label htmlFor="jump-to-page">Jump to page:</label>
        <select
          id="jump-to-page"
          value={currentPage}
          onChange={handleJump}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <option key={page} value={page}>
              {page}
            </option>
          ))}
        </select>
      </div>
    </nav>
  );
};

export default Pagination;
