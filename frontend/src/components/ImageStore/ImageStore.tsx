import React, { useState, useEffect, useCallback } from "react";
import { getImageDocuments, deleteImageDocument, getAvailableDomains } from "../../api/imageStoreApi";
import { deleteDomain } from "../../api/textStoreApi";
import type { ImageDocument } from "../../api/imageStoreApi";
import FilterBar from "../../components/FilterBar/FilterBar"; // Reusing FilterBar
import Pagination from "../../components/Pagination/Pagination";
import ConfirmationModal from "../ConfirmationModal/ConfirmationModal";
import { FiPlus, FiEdit, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import "./ImageStore.css";

const PROTECTED_DOMAINS = ["data_science", "medical"];

const ImageStore: React.FC = () => {
  const [documents, setDocuments] = useState<ImageDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = sessionStorage.getItem('imageStoreCurrentPage');
    return savedPage ? parseInt(savedPage, 10) : 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState(() => {
    const savedFilters = sessionStorage.getItem('imageStoreFilters');
    return savedFilters ? JSON.parse(savedFilters) : { category: "", filename: "" };
  });
  const [selectedDomain, setSelectedDomain] = useState("data_science");
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const pageSize = 10;
  const navigate = useNavigate();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getImageDocuments(
        currentPage,
        pageSize,
        filters.category || null,
        filters.filename || null,
        null, // search
        selectedDomain
      );
      setDocuments(response.documents);
      setTotalPages(Math.ceil(response.total / pageSize));
    } catch (error) {
      console.error("Failed to fetch image documents:", error);
      setDocuments([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters, selectedDomain]);

  useEffect(() => {
    fetchDocuments();
    sessionStorage.removeItem('imageStoreCurrentPage');
    sessionStorage.removeItem('imageStoreFilters');
  }, [fetchDocuments]);

  useEffect(() => {
    // Load available domains on component mount
    getAvailableDomains()
      .then(domains => setAvailableDomains(domains))
      .catch(error => console.error("Failed to fetch domains:", error));
  }, []);

  const handleFilterChange = useCallback((newFilters: {
    category: string;
    filename: string;
  }) => {
    setCurrentPage(1); // Reset to first page when filters change
    setFilters(newFilters);
  }, []);

  const handleDelete = async (docId: string) => {
    if (window.confirm("Are you sure you want to delete this image document?")) {
      try {
        await deleteImageDocument(docId, selectedDomain);
        // Refetch documents after deletion
        const response = await getImageDocuments(
          currentPage,
          pageSize,
          filters.category || null,
          filters.filename || null,
          null,
          selectedDomain
        );
        setDocuments(response.documents);
        setTotalPages(Math.ceil(response.total / pageSize));
      } catch (error) {
        console.error("Failed to delete image document:", error);
      }
    }
  };

  const handleDeleteDomainConfirm = async () => {
    try {
      await deleteDomain(selectedDomain);
      setIsDeleteModalOpen(false);
      
      // Refresh available domains and switch to data_science
      const updatedDomains = await getAvailableDomains();
      setAvailableDomains(updatedDomains);
      
      const nextDomain = updatedDomains.includes('data_science') ? 'data_science' : updatedDomains[0];
      setSelectedDomain(nextDomain);
      navigate(`/vector-database/image-store?domain=${encodeURIComponent(nextDomain)}`);
    } catch (error) {
      console.error("Failed to delete domain:", error);
      setIsDeleteModalOpen(false);
      alert(error instanceof Error ? error.message : "Failed to delete domain");
    }
  };

  // Helper function to format filename with page number
  const formatFilenameWithPage = (
    filename: string | null | undefined,
    pageNumber?: number | null
  ): string => {
    const displayFilename = filename || "N/A"; // Handle undefined or null filename
    if (pageNumber !== null && pageNumber !== undefined) {
      return `${displayFilename} \n (Page ${pageNumber})`;
    }
    return displayFilename;
  };

  return (
    <div className="image-store-container">
      <div className="image-store-header">
        <h1>Image Store</h1>
        <button className="add-new-btn" onClick={() => {
          sessionStorage.setItem('imageStoreCurrentPage', currentPage.toString());
          sessionStorage.setItem('imageStoreFilters', JSON.stringify(filters));
          navigate('/vector-database/image-store/add');
        }}>
          <FiPlus />
          <span>Add New Image</span>
        </button>
      </div>

      {/* Domain Filter */}
      <div className="domain-filter" style={{ 
        marginBottom: '16px',
        padding: '12px',
        background: 'linear-gradient(145deg, #1c1c1c, #161616)',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: '1px solid #2a2a2a'
      }}>
        <label htmlFor="domain-select" style={{ fontWeight: 'bold' }}>
          Domain:
        </label>
        <select
          id="domain-select"
          value={selectedDomain}
          onChange={(e) => {
            setSelectedDomain(e.target.value);
            setCurrentPage(1); // Reset to first page when domain changes
            setFilters({ category: "", filename: "" }); // Reset filters when domain changes
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid #2a2a2a',
            borderRadius: '4px',
            fontSize: '14px',

            backgroundColor: '#1e1e1e',
            color: '#ffffff',

            outline: 'none',
            cursor: 'pointer'
          }}
        >
          {availableDomains.map(domain => (
            <option key={domain} value={domain}>
              {domain.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
        <span style={{ fontSize: '16px', color: '#666' }}>
          Showing images from the selected domain
        </span>

        {!PROTECTED_DOMAINS.includes(selectedDomain) && (
          <button 
            className="delete-domain-btn"
            onClick={() => setIsDeleteModalOpen(true)}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              color: '#ef5350',
              border: '1px solid rgba(211, 47, 47, 0.3)',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(211, 47, 47, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(211, 47, 47, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(211, 47, 47, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(211, 47, 47, 0.3)';
            }}
          >
            <FiAlertTriangle />
            <span>Delete Domain</span>
          </button>
        )}
      </div>

      <FilterBar 
        onFilterChange={handleFilterChange} 
        domain={selectedDomain}
        storeType="image"
      />

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <table className="document-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Document ID</th>
                <th>Image Summary</th>
                <th>Image</th>
                <th>Category</th>
                <th>Filename</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, index) => (
                <tr key={doc.id}>
                  <td>{(currentPage - 1) * pageSize + index + 1}</td>
                  <td>{doc.doc_id}</td>
                  <td className="image-summary-cell">
                    {doc.image_summary}
                  </td>
                  <td className="image-cell">
                    {doc.image_base64 ? (
                      <img src={`data:image/jpeg;base64,${doc.image_base64}`} alt="Document Image" className="document-image" />
                    ) : (
                      <span>No Image</span>
                    )}
                  </td>
                  <td>{doc.category}</td>
                  <td className="filename-cell">
                    {formatFilenameWithPage(doc.filename, doc.page_number)}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn edit-btn" title="Edit" onClick={() => {
                        sessionStorage.setItem('imageStoreCurrentPage', currentPage.toString());
                        sessionStorage.setItem('imageStoreFilters', JSON.stringify(filters));
                        navigate(`/vector-database/image-store/edit/${doc.doc_id}`);
                      }}>
                        <FiEdit />
                        <span>Edit</span>
                      </button>
                      <button
                        className="action-btn delete-btn"
                        title="Delete"
                        onClick={() => handleDelete(doc.doc_id || '')}
                      >
                        <FiTrash2 />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Entire Domain?"
        message={`WARNING: Are you sure you want to delete the domain "${selectedDomain.replace('_', ' ').toUpperCase()}"? This will permanently remove ALL associated documents and assets. This action is irreversible.`}
        confirmLabel="Permanently Delete"
        onConfirm={handleDeleteDomainConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
        isDestructive={true}
      />
    </div>
  );
};

export default ImageStore;
