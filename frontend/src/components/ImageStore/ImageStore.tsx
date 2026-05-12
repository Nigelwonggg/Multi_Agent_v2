import React, { useState, useEffect, useCallback } from "react";
import { getImageDocuments, deleteImageDocument, getAvailableDomains } from "../../api/imageStoreApi";
import type { ImageDocument } from "../../api/imageStoreApi";
import FilterBar from "../../components/FilterBar/FilterBar"; // Reusing FilterBar
import Pagination from "../../components/Pagination/Pagination";
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import "./ImageStore.css";

const ImageStore: React.FC = () => {
  const [searchParams] = useSearchParams();
  const domainFromQuery = searchParams.get('domain') || 'data_science';
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
  const [selectedDomain, setSelectedDomain] = useState(domainFromQuery);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [deleteCandidate, setDeleteCandidate] = useState<ImageDocument | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  useEffect(() => {
    setSelectedDomain((previousDomain) => {
      if (previousDomain === domainFromQuery) {
        return previousDomain;
      }

      setCurrentPage(1);
      setFilters({ category: "", filename: "" });
      return domainFromQuery;
    });
  }, [domainFromQuery]);

  const handleFilterChange = useCallback((newFilters: {
    category: string;
    filename: string;
  }) => {
    setCurrentPage(1); // Reset to first page when filters change
    setFilters(newFilters);
  }, []);

  const handleDeleteRequest = (doc: ImageDocument) => {
    setDeleteCandidate(doc);
    setDeleteError(null);
  };

  const handleDeleteCancel = () => {
    if (deleting) return;
    setDeleteCandidate(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate?.doc_id) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteImageDocument(deleteCandidate.doc_id, selectedDomain);
      setDeleteCandidate(null);
      await fetchDocuments();
    } catch (error) {
      console.error("Failed to delete image document:", error);
      setDeleteError("Failed to delete this image. Please try again.");
    } finally {
      setDeleting(false);
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
          navigate(`/vector-database/image-store/add?domain=${encodeURIComponent(selectedDomain)}`);
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
                        if (!doc.doc_id) return;
                        sessionStorage.setItem('imageStoreCurrentPage', currentPage.toString());
                        sessionStorage.setItem('imageStoreFilters', JSON.stringify(filters));
                        navigate(`/vector-database/image-store/edit/${doc.doc_id}?domain=${encodeURIComponent(selectedDomain)}`);
                      }} disabled={!doc.doc_id}>
                        <FiEdit />
                        <span>Edit</span>
                      </button>
                      <button
                        className="action-btn delete-btn"
                        title="Delete"
                        onClick={() => handleDeleteRequest(doc)}
                        disabled={!doc.doc_id}
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

      {deleteCandidate && (
        <div className="store-delete-modal-backdrop" role="presentation" onClick={handleDeleteCancel}>
          <div
            className="store-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="store-delete-modal-icon">
              <FiTrash2 />
            </div>
            <h2 id="image-delete-title">Delete image?</h2>
            <p>
              This will remove <strong>{deleteCandidate.filename || deleteCandidate.doc_id}</strong> from the {selectedDomain.replace('_', ' ')} image store.
            </p>
            {deleteError && <div className="store-delete-modal-error">{deleteError}</div>}
            <div className="store-delete-modal-actions">
              <button type="button" className="store-modal-cancel" onClick={handleDeleteCancel} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="store-modal-delete" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageStore;
