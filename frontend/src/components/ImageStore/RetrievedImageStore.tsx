import React, { useState, useEffect } from 'react';
import { getImageDocumentsByIds, getImageDocumentsByDomain } from '../../api/imageStoreApi';
import type { ImageDocument } from "../../api/imageStoreApi";
import './ImageStore.css';

interface RetrievedImageStoreProps {
  docIds: string[];
  docsByDomain?: Record<string, string[]>; // New domain-aware prop
}

const RetrievedImageStore: React.FC<RetrievedImageStoreProps> = ({ docIds = [], docsByDomain }) => {
  const [documents, setDocuments] = useState<ImageDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainInfo, setDomainInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        let response: ImageDocument[] = [];
        let docDomainMapping: Record<string, string> = {};
        
        if (docsByDomain && Object.keys(docsByDomain).length > 0) {
          // Use domain-aware fetching
          console.log('🖼️ Fetching images using domain-aware method:', docsByDomain);
          response = await getImageDocumentsByDomain(docsByDomain);
          
          // Create mapping of doc_id to domain for display purposes
          Object.entries(docsByDomain).forEach(([domain, docIdList]) => {
            docIdList.forEach(docId => {
              docDomainMapping[docId] = domain;
            });
          });
        } else if (docIds.length > 0 && docIds[0] !== '') {
          // Fallback to legacy method
          console.log('⚠️ Using legacy image fetching method');
          response = await getImageDocumentsByIds(docIds);
        }
        
        setDocuments(response);
        setDomainInfo(docDomainMapping);
      } catch (error) {
        console.error('Failed to fetch image documents:', error);
      } finally {
        setLoading(false);
      }
    };

    // Check for empty array or an array with a single empty string
    if ((docIds.length > 0 && docIds[0] !== '') || (docsByDomain && Object.keys(docsByDomain).length > 0)) {
      fetchDocuments();
    } else {
      setLoading(false); // Stop loading if there are no doc IDs
      setDocuments([]); // Clear any existing documents
    }
  }, [docIds, docsByDomain]);

  // Helper function to format filename with page number
  const formatFilenameWithPage = (
    filename: string | null | undefined,
    pageNumber?: number | null
  ): string => {
    const displayFilename = filename || "N/A"; // Handle undefined or null filename
    if (pageNumber !== null && pageNumber !== undefined) {
      return `${displayFilename} 
 (Page ${pageNumber})`;
    }
    return displayFilename;
  };

  return (
    <div className="image-store-container">
      <h1>Retrieved Image Documents</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {Object.keys(domainInfo).length > 0 && (
            <div className="domain-info-banner" style={{ 
              background: '#e3f2fd', 
              padding: '12px', 
              borderRadius: '6px', 
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              🖼️ <strong>Domain-aware retrieval:</strong> Showing images from {Object.values(domainInfo).filter((v, i, a) => a.indexOf(v) === i).join(', ')} domains
            </div>
          )}
          <table className="document-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Document ID</th>
                <th>Image Summary</th>
                <th>Image</th>
                <th>Category</th>
                <th>Filename</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, index) => (
                <tr key={doc.id}>
                  <td>{index + 1}</td>
                  <td>{doc.doc_id}</td>
                  <td className="image-summary-cell">{doc.image_summary}</td>
                  <td className="image-cell">
                    {doc.image_base64 ? (
                      <img
                        src={`data:image/jpeg;base64,${doc.image_base64}`}
                        alt="Document"
                        className="document-image"
                      />
                    ) : (
                      <span>No Image</span>
                    )}
                  </td>
                  <td>{doc.category}</td>
                  <td className="filename-cell">
                    {formatFilenameWithPage(doc.filename ?? 'Unknown Filename', doc.page_number)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RetrievedImageStore;

