import React from 'react';
import { FiCheckCircle, FiClock } from 'react-icons/fi';
import { extractDocIds, getDocsByDomain } from '../../api/chatApi';
import type { DomainDocReference } from '../../api/chatApi';
import './MessageMetadata.css';

interface MessageMetadataProps {
  metadata: {
    routes: string;
    is_rag_used: boolean;
    processing_time: number;
    docs?: string[] | DomainDocReference[];
    image_docs?: string[] | DomainDocReference[];
  };
}

const canCurrentUserOpenReferences = () => {
  const storedUser = localStorage.getItem('user');

  if (!storedUser) return false;

  try {
    const user = JSON.parse(storedUser) as { role?: string };
    return user.role === 'lecturer' || user.role === 'admin';
  } catch {
    return false;
  }
};

const MessageMetadata: React.FC<MessageMetadataProps> = ({ metadata }) => {
  const { is_rag_used, processing_time, docs, image_docs } = metadata;
  const canOpenReferences = canCurrentUserOpenReferences();

  const handleRagTagClick = () => {
    if (canOpenReferences && is_rag_used && (docs?.length || image_docs?.length)) {
      console.log('🔍 RAG tag clicked - Raw metadata:', { docs, image_docs });
      console.log('🔍 Doc types:', { 
        docsType: docs ? typeof docs[0] : 'none', 
        imageDocsType: image_docs ? typeof image_docs[0] : 'none' 
      });
      
      // Handle both legacy and new domain-aware document formats
      const queryParams = new URLSearchParams();
      
      // Always default to text tab
      const defaultTab = 'text';
      
      if (docs && docs.length > 0) {
        // Group documents by domain for efficient fetching
        const docsByDomain = getDocsByDomain(docs);
        
        // For backward compatibility with current URL structure, we'll pass all doc IDs
        // and include domain information as JSON
        const docIds = extractDocIds(docs);
        queryParams.append('docs', docIds.join(','));
        queryParams.append('domains_info', JSON.stringify(docsByDomain));
        console.log('📋 Text docs processing:', { 
          originalDocs: docs, 
          docsByDomain, 
          docIds,
          urlParams: queryParams.toString()
        });
      }
      
      if (image_docs && image_docs.length > 0) {
        // Group image documents by domain
        const imageDocsByDomain = getDocsByDomain(image_docs);
        
        const imageDocIds = extractDocIds(image_docs);
        queryParams.append('image_docs', imageDocIds.join(','));
        queryParams.append('image_domains_info', JSON.stringify(imageDocsByDomain));
        console.log('🖼️ Image docs processing:', { 
          originalImageDocs: image_docs, 
          imageDocsByDomain, 
          imageDocIds 
        });
      }
      
      // Always add text tab parameter
      queryParams.append('tab', defaultTab);
      
      const finalUrl = `/retrieved-content?${queryParams.toString()}`;
      console.log('🔗 Opening URL:', finalUrl);
      window.open(finalUrl, '_blank');
    }
  };

  return (
    <div className="metadata-container">
      {is_rag_used && (
        <div 
          className={`metadata-tag-wrapper rag-tag ${canOpenReferences ? '' : 'reference-disabled'}`}
          onClick={canOpenReferences ? handleRagTagClick : undefined}
          aria-disabled={!canOpenReferences}
        >
          <div className="metadata-tag">
            <FiCheckCircle className="tag-icon" />
            <span>References</span>
          </div>
          <div className="tooltip">
            {canOpenReferences ? 'RAG Used: Yes. Click to view retrieved content.' : 'References are available to admin accounts only.'}
          </div>
        </div>
      )}

      {/* <div className="metadata-tag-wrapper route-tag">
        <div className="metadata-tag">
          <FiInfo className="tag-icon" />
          <span>{routes}</span>
        </div>
        <div className="tooltip">Routes: {routes}</div>
      </div> */}

      <div className="metadata-tag-wrapper time-tag">
        <div className="metadata-tag">
          <FiClock className="tag-icon" />
          <span>{(processing_time / 1000).toFixed(2)}s</span>
        </div>
        <div className="tooltip">Processing Time: {processing_time}ms</div>
      </div>
    </div>
  );
};

export default MessageMetadata;
