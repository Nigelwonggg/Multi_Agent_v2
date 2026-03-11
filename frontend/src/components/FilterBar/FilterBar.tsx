import React, { useState, useEffect } from "react";
import { getFilterOptions } from "../../api/textStoreApi";
import { getFilterOptionsForImages } from "../../api/imageStoreApi";
import "./FilterBar.css";

interface FilterBarProps {
  onFilterChange: (filters: { category: string; filename: string }) => void;
  domain?: string;
  storeType?: 'text' | 'image';
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  onFilterChange, 
  domain = "data_science", 
  storeType = "text" 
}) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [filenames, setFilenames] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedFilename, setSelectedFilename] = useState("");

  // Reset filters when domain changes
  useEffect(() => {
    setSelectedCategory("");
    setSelectedFilename("");
    onFilterChange({ category: "", filename: "" });
  }, [domain, storeType]); // Remove onFilterChange from dependencies

  // Fetch filter options - re-run when selectedCategory, domain, or storeType changes
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const options = storeType === 'image' 
          ? await getFilterOptionsForImages(selectedCategory || null, domain)
          : await getFilterOptions(selectedCategory || null, domain);
        
        setCategories(options.categories);
        setFilenames(options.filenames);
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      }
    };
    fetchOptions();
  }, [selectedCategory, domain, storeType]); // Re-fetch when any of these change

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value;
    setSelectedCategory(category);
    setSelectedFilename(''); // Reset filename when category changes
    onFilterChange({ category, filename: '' }); // Reset filename in parent
  };

  const handleFilenameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const filename = e.target.value;
    setSelectedFilename(filename);
    onFilterChange({ category: selectedCategory, filename });
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedFilename("");
    onFilterChange({ category: "", filename: "" });
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label htmlFor="category">Category:</label>
        <select
          id="category"
          value={selectedCategory}
          onChange={handleCategoryChange}
        >
          <option value="">All</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <label htmlFor="filename">Filename:</label>
        <select
          id="filename"
          value={selectedFilename}
          onChange={handleFilenameChange}
        >
          <option value="">All</option>
          {filenames.map((fname) => (
            <option key={fname} value={fname}>
              {fname}
            </option>
          ))}
        </select>
      </div>
      <button className="clear-filters-btn" onClick={clearFilters}>
        Clear Filters
      </button>
    </div>
  );
};

export default FilterBar;
