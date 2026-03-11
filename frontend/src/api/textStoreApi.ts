// Update your existing textStoreApi.ts to use real backend
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const getAvailableDomains = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE}/api/domains/`);
  if (!response.ok) {
    throw new Error('Failed to fetch available domains');
  }
  return await response.json();
};

export interface TextDocument {
  id: number;
  doc_id?: string; // Made optional
  summary_text: string;
  raw_text: string;
  category: string;
  filename: string;  // Just the filename
  page_number?: number | null;  // Page number as int or null
}

export interface FilterOptions {
  categories: string[];
  filenames: string[];
}


export const getFilterOptions = async (
  category: string | null = null,
  domain: string = "data_science"
): Promise<FilterOptions> => {
  const params = new URLSearchParams();
  if (category) {
    params.append('category', category);
  }
  params.append('domain', domain);
  
  const url = `${API_BASE}/api/text-store/filter-options${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch filter options');
  }
  return await response.json();
};

export const getTextDocuments = async (
  page: number = 1,
  pageSize: number = 10,
  category: string | null = null,
  filename: string | null = null,
  search: string | null = null,
  domain: string = "data_science"
): Promise<{ documents: TextDocument[], total: number, page: number, page_size: number }> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    domain: domain,
  });
  
  if (category) params.append('category', category);
  if (filename) params.append('filename', filename);
  if (search) params.append('search', search);

  const response = await fetch(`${API_BASE}/api/text-store/?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }
  return await response.json();
};

export const getTextDocument = async (docId: string): Promise<TextDocument> => {
  const response = await fetch(`${API_BASE}/api/text-store/${docId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch document');
  }
  return await response.json();
};

export const createTextDocument = async (document: Omit<TextDocument, 'id'>): Promise<TextDocument> => {
  const response = await fetch(`${API_BASE}/api/text-store/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(document),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create document');
  }
  return await response.json();
};

export const updateTextDocument = async (docId: string, document: Partial<TextDocument>): Promise<TextDocument> => {
  const response = await fetch(`${API_BASE}/api/text-store/${docId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(document),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update document');
  }
  return await response.json();
};

export const deleteTextDocument = async (docId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/api/text-store/${docId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete document');
  }
};

export const searchDocuments = async (query: string, limit: number = 10): Promise<TextDocument[]> => {
  const response = await fetch(`${API_BASE}/api/text-store/search/content?query=${encodeURIComponent(query)}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to search documents');
  }
  return await response.json();
};

import dummyTextDocs from "./dummy_text_docs.json";

export const getTextDocumentsByIds = async (
  docIds: string[]
): Promise<TextDocument[]> => {
  console.log("Fetching text documents by IDs:", docIds);
  
  if (docIds.length === 0) {
    return [];
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/text-store/by-ids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doc_ids: docIds
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch documents by IDs');
    }
    
    const documents = await response.json();
    console.log(`✅ Fetched ${documents.length} documents by IDs`);
    return documents;
    
  } catch (error) {
    console.error("❌ Error fetching documents by IDs:", error);
    
    // Fallback to dummy data in case of error
    const filteredDocs = dummyTextDocs.filter((doc) =>
      docIds.includes(doc.doc_id)
    );
    console.log(`⚠️ Using fallback data: ${filteredDocs.length} documents`);
    return filteredDocs;
  }
};

/**
 * Fetch text documents from multiple domains by their IDs
 */
export const getTextDocumentsByDomain = async (
  docsByDomain: Record<string, string[]>
): Promise<TextDocument[]> => {
  console.log("Fetching text documents by domain:", docsByDomain);
  
  try {
    const response = await fetch(`${API_BASE}/api/text-store/by-domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        docs_by_domain: docsByDomain
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const documents = await response.json();
    console.log(`✅ Fetched ${documents.length} total documents from all domains`);
    return documents;
    
  } catch (error) {
    console.error(`❌ Error fetching documents by domain:`, error);
    return [];
  }
};
