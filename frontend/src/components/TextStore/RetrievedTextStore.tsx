import React, { useState, useEffect } from 'react';
import { getTextDocumentsByIds, getTextDocumentsByDomain } from '../../api/textStoreApi';
import type { TextDocument } from '../../api/textStoreApi';
import MarkdownRenderer from '../MarkdownRenderer/MarkdownRenderer'; // Import MarkdownRenderer
import './TextStore.css';

interface RetrievedTextStoreProps {
  docIds: string[];
  docsByDomain?: Record<string, string[]>; // New domain-aware prop
}

const RetrievedTextStore: React.FC<RetrievedTextStoreProps> = ({ docIds, docsByDomain }) => {
  const [documents, setDocuments] = useState<TextDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainInfo, setDomainInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        let response: TextDocument[] = [];
        let docDomainMapping: Record<string, string> = {};
        
        console.log('🔍 RetrievedTextStore - Input params:', { 
          docIds, 
          docsByDomain,
          docIdsLength: docIds.length,
          docsByDomainKeys: Object.keys(docsByDomain || {}),
          willUseDomainAware: docsByDomain && Object.keys(docsByDomain).length > 0,
          willUseLegacy: docIds.length > 0 && docIds[0] !== '' && !(docsByDomain && Object.keys(docsByDomain).length > 0)
        });
        
        
        if (docsByDomain && Object.keys(docsByDomain).length > 0) {
          // Use domain-aware fetching
          console.log('🔍 Fetching documents using domain-aware method:', docsByDomain);
          response = await getTextDocumentsByDomain(docsByDomain);
          
          // Create mapping of doc_id to domain for display purposes
          Object.entries(docsByDomain).forEach(([domain, docIdList]) => {
            docIdList.forEach(docId => {
              docDomainMapping[docId] = domain;
            });
          });
        } else if (docIds.length > 0 && docIds[0] !== '') {
          // Fallback to legacy method
          console.log('⚠️ Using legacy document fetching method');
          response = await getTextDocumentsByIds(docIds);
        }
        
        setDocuments(response);
        setDomainInfo(docDomainMapping);
      } catch (error) {
        console.error('Failed to fetch text documents:', error);
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
    filename: string,
    pageNumber?: number | null
  ): string => {
    if (pageNumber !== null && pageNumber !== undefined) {
      return `${filename} \n (Page ${pageNumber})`;
    }
    return filename;
  };

  return (
    <div className="text-store-container">
      <h1>Retrieved Text Documents</h1>
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
              📋 <strong>Domain-aware retrieval:</strong> Showing documents from {Object.values(domainInfo).filter((v, i, a) => a.indexOf(v) === i).join(', ')} domains
            </div>
          )}
          <table className="document-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Document ID</th>
                <th>Summary</th>
                <th>Raw Text</th>
                <th>Category</th>
                <th>Filename</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, index) => (
                <tr key={doc.id}>
                  <td>{index + 1}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RetrievedTextStore;

