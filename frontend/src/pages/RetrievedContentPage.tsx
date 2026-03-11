import React from 'react';
import { useLocation } from 'react-router-dom';
import RetrievedTextStore from '../components/TextStore/RetrievedTextStore';
import RetrievedImageStore from '../components/ImageStore/RetrievedImageStore';
import TopNavBar from '../components/TopNavBar/TopNavBar';
import './RetrievedContentPage.css';

const RetrievedContentPage: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const textDocIds = params.get('docs')?.split(',').filter(id => id.trim() !== '') || [];
  const imageDocIds = params.get('image_docs')?.split(',').filter(id => id.trim() !== '') || [];
  
  // Get domain information (new feature)
  const domainsInfoParam = params.get('domains_info');
  const imageDomainsInfoParam = params.get('image_domains_info');
  
  let textDocsByDomain: Record<string, string[]> = {};
  let imageDocsByDomain: Record<string, string[]> = {};
  
  try {
    textDocsByDomain = domainsInfoParam ? JSON.parse(domainsInfoParam) : {};
    imageDocsByDomain = imageDomainsInfoParam ? JSON.parse(imageDomainsInfoParam) : {};
  } catch (error) {
    console.warn('Failed to parse domain information:', error);
  }
  
  const activeTab = params.get('tab') || 'text';
  
  // Debug logging
  console.log('🔍 RetrievedContentPage - Raw URL params:', {
    allParams: Object.fromEntries(params.entries()),
    docsParam: params.get('docs'),
    imageDocsParam: params.get('image_docs'),
    domainsInfoParam: params.get('domains_info'),
    imageDomainsInfoParam: params.get('image_domains_info'),
    tabParam: params.get('tab')
  });
  
  console.log('🔍 RetrievedContentPage - Processed params:', {
    textDocIds,
    imageDocIds,
    textDocsByDomain,
    imageDocsByDomain,
    activeTab
  });

  return (
    <div className="retrieved-content-page">
      <TopNavBar basePath="/retrieved-content" />
      <div className="content">
        {activeTab === 'text' ? (
          <RetrievedTextStore 
            docIds={textDocIds} 
            docsByDomain={textDocsByDomain}
          />
        ) : (
          <RetrievedImageStore 
            docIds={imageDocIds} 
            docsByDomain={imageDocsByDomain}
          />
        )}
      </div>
    </div>
  );
};

export default RetrievedContentPage;
