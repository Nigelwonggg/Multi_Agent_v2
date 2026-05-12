import React, { useState, useEffect, useCallback } from "react";
import { getTextDocuments, deleteTextDocument, getAvailableDomains } from "../../api/textStoreApi";
import type { TextDocument } from "../../api/textStoreApi";
import MarkdownRenderer from "../MarkdownRenderer/MarkdownRenderer";
import FilterBar from "../FilterBar/FilterBar";
import Pagination from "../Pagination/Pagination";
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import "./TextStore.css";

const TextStore: React.FC = () => {
  const [searchParams] = useSearchParams();
  const domainFromQuery = searchParams.get('domain') || 'data_science';
  const [documents, setDocuments] = useState<TextDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = sessionStorage.getItem('currentPage');
    return savedPage ? parseInt(savedPage, 10) : 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState(() => {
    const savedFilters = sessionStorage.getItem('filters');
    return savedFilters ? JSON.parse(savedFilters) : { category: "", filename: "" };
  });
  const [selectedDomain, setSelectedDomain] = useState(domainFromQuery);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [deleteCandidate, setDeleteCandidate] = useState<TextDocument | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 10;
  const navigate = useNavigate();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getTextDocuments(
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
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters, selectedDomain]);

  useEffect(() => {
    fetchDocuments();
    // Clear the stored state after it's been used
    sessionStorage.removeItem('currentPage');
    sessionStorage.removeItem('filters');
  }, [fetchDocuments]);

  useEffect(() => {
    // Load available domains on component mount
    getAvailableDomains()
      .then(domains => setAvailableDomains(domains))
      .catch(error => console.error("Failed to fetch domains:", error));
  }, []);

  useEffect(() => {
    // Sync only when URL query value itself changes.
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

  const handleDeleteRequest = (doc: TextDocument) => {
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
      await deleteTextDocument(deleteCandidate.doc_id, selectedDomain);
      setDeleteCandidate(null);
      await fetchDocuments();
    } catch (error) {
      console.error("Failed to delete document:", error);
      setDeleteError("Failed to delete this document. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // Create a helper function to format filename with page number
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
    <div className="text-store-container">
      <div className="text-store-header">
        <h1>Text Store</h1>
        <button className="add-new-btn" onClick={() => {
          sessionStorage.setItem('currentPage', currentPage.toString());
          sessionStorage.setItem('filters', JSON.stringify(filters));
          navigate(`/vector-database/text-store/add?domain=${encodeURIComponent(selectedDomain)}`);
        }}>
          <FiPlus />
          <span>Add New</span>
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
        <span style={{ fontSize: '12px', color: '#666' }}>
          Showing documents from the selected domain
        </span>
      </div>

      <FilterBar 
        onFilterChange={handleFilterChange} 
        domain={selectedDomain}
        storeType="text"
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
                <th>Summary Text</th>
                <th>Raw Text</th>
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
                  <td className="markdown-cell">
                    <MarkdownRenderer content={doc.summary_text} />
                  </td>
                  <td className="markdown-cell">
                    <MarkdownRenderer content={doc.raw_text} />
                  </td>
                  <td>{doc.category}</td>
                  <td className="filename-cell">
                    {formatFilenameWithPage(doc.filename, doc.page_number)}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn edit-btn" title="Edit" onClick={() => {
                        if (!doc.doc_id) return;
                        sessionStorage.setItem('currentPage', currentPage.toString());
                        sessionStorage.setItem('filters', JSON.stringify(filters));
                        navigate(`/vector-database/text-store/edit/${doc.doc_id}?domain=${encodeURIComponent(selectedDomain)}`);
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
            aria-labelledby="text-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="store-delete-modal-icon">
              <FiTrash2 />
            </div>
            <h2 id="text-delete-title">Delete text?</h2>
            <p>
              This will remove <strong>{deleteCandidate.filename || deleteCandidate.doc_id}</strong> from the {selectedDomain.replace('_', ' ')} text store.
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

export default TextStore;
