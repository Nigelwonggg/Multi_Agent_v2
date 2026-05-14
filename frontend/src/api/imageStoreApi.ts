const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const domainQuery = (domain: string = "data_science") =>
  `domain=${encodeURIComponent(domain)}`;

export const getAvailableDomains = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE}/api/domains/`);
  if (!response.ok) {
    throw new Error('Failed to fetch available domains');
  }
  return await response.json();
};

export interface ImageDocument {
  id: number; // Position index
  doc_id?: string; // Actual vector store ID (made optional)
  image_base64: string; // Base64 encoded image string
  image_summary: string; // Summary text for the image
  category: string;
  filename?: string | null; // Just the filename (made optional and nullable)
  page_number?: number | null; // Page number as int or null
}

export interface FilterOptions {
  categories: string[];
  filenames: string[];
}

export const getFilterOptionsForImages = async (
  category: string | null = null,
  domain: string = "data_science"
): Promise<FilterOptions> => {
  const params = new URLSearchParams();
  if (category) {
    params.append('category', category);
  }
  params.append('domain', domain);
  
  const url = `${API_BASE}/api/image-store/filter-options${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch image filter options');
  }
  return await response.json();
};

export const getImageDocuments = async (
  page: number = 1,
  pageSize: number = 10,
  category: string | null = null,
  filename: string | null = null,
  search: string | null = null,
  domain: string = "data_science"
): Promise<{ documents: ImageDocument[], total: number, page: number, page_size: number }> => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    domain: domain,
  });
  
  if (category) params.append('category', category);
  if (filename) params.append('filename', filename);
  if (search) params.append('search', search);

  const response = await fetch(`${API_BASE}/api/image-store/?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch image documents');
  }
  return await response.json();
};

export const getImageDocument = async (
  docId: string,
  domain: string = "data_science"
): Promise<ImageDocument> => {
  const params = new URLSearchParams({ domain });
  const response = await fetch(`${API_BASE}/api/image-store/${docId}?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch image document');
  }
  return await response.json();
};

export const createImageDocument = async (
  document: Omit<ImageDocument, 'id'>,
  domain: string = "data_science"
): Promise<ImageDocument> => {
  const params = new URLSearchParams({ domain });
  const response = await fetch(`${API_BASE}/api/image-store/?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(document),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create image document');
  }
  return await response.json();
};

export const updateImageDocument = async (
  docId: string, 
  document: Partial<ImageDocument>,
  domain: string = "data_science"
): Promise<ImageDocument> => {
  const params = new URLSearchParams({ domain });
  const response = await fetch(`${API_BASE}/api/image-store/${docId}?${params}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(document),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update image document');
  }
  return await response.json();
};

export const deleteImageDocument = async (
  docId: string,
  domain: string = "data_science"
): Promise<void> => {
  const params = new URLSearchParams({ domain });
  const response = await fetch(`${API_BASE}/api/image-store/${docId}?${params}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete image document');
  }
};

export const searchImageDocuments = async (
  query: string, 
  limit: number = 10,
  domain: string = "data_science"
): Promise<ImageDocument[]> => {
  const params = new URLSearchParams({
    query: query,
    limit: limit.toString(),
    domain: domain
  });
  const response = await fetch(`${API_BASE}/api/image-store/search/content?${params}`);
  if (!response.ok) {
    throw new Error('Failed to search image documents');
  }
  return await response.json();
};


export const getImageDocumentsByIds = async (
  docIds: string[],
  domain: string = "data_science"
): Promise<ImageDocument[]> => {
  console.log("Fetching image documents by IDs:", docIds);
  
  if (docIds.length === 0) {
    return [];
  }
  
  try {
    const params = new URLSearchParams({ domain });
    const response = await fetch(`${API_BASE}/api/image-store/by-ids?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doc_ids: docIds
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch image documents by IDs');
    }
    
    const documents = await response.json();
    console.log(`✅ Fetched ${documents.length} image documents by IDs`);
    return documents;
    
  } catch (error) {
    console.error("❌ Error fetching image documents by IDs:", error);
    return [];
  }
};

/**
 * Fetch image documents from multiple domains by their IDs
 */
export const getImageDocumentsByDomain = async (
  docsByDomain: Record<string, string[]>
): Promise<ImageDocument[]> => {
  console.log("Fetching image documents by domain:", docsByDomain);
  
  try {
    const response = await fetch(`${API_BASE}/api/image-store/by-domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        docs_by_domain: docsByDomain
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch image documents by domain');
    }
    
    const documents = await response.json();
    console.log(`✅ Fetched ${documents.length} image documents across all domains`);
    return documents;
    
  } catch (error) {
    console.error("❌ Error fetching image documents by domain:", error);
    return [];
  }
};
