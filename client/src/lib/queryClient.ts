import { QueryClient } from "@tanstack/react-query";

/**
 * Normalize API endpoint URL
 * Ensures consistent handling of /api prefix and slashes
 */
function normalizeUrl(url: string): string {
  // Strip any existing /api prefix and leading/trailing slashes
  let normalizedUrl = url.replace(/^\/+|\/+$/g, '').replace(/^api\//, '');

  // Add /api prefix
  return `/api/${normalizedUrl}`;
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  try {
    // For development/testing when no backend is available
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1');
    
    const shouldMock = isDevelopment || localStorage.getItem('MOCK_API') === 'true';
    
    if (shouldMock) {
      console.debug(`[MOCK API] ${method} ${url}`, data ? { data } : '');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      // Return mock data
      return { success: true } as unknown as T;
    }

    const normalizedUrl = normalizeUrl(url);
    console.debug(`[API Request] ${method} ${normalizedUrl}`, data ? { data } : '');

    const res = await fetch(normalizedUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    // First check if the response is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`API Error: ${errorData.message || 'Unknown error'} (${res.status})`);
    }

    return res.json();
  } catch (error) {
    console.error(`[API Error] ${method} ${url} failed:`, error);
    throw error;
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey }) => {
        const url = queryKey[0] as string;
        return apiRequest("GET", url);
      },
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
    mutations: {
      retry: false,
    },
  },
});

// Initialize API keys from environment or local storage
export function getApiKeys() {
  try {
    // First check localStorage
    const localKeys = localStorage.getItem('apiKeys');
    if (localKeys) {
      return JSON.parse(localKeys);
    }
    
    // Use the keys from .env as defaults
    // These are already available through our project-wide .env handling
    const defaultKeys = {
      openai: process.env.OPENAI_API_KEY || localStorage.getItem('OPENAI_API_KEY') || '',
      anthropic: process.env.ANTHROPIC_API_KEY || localStorage.getItem('ANTHROPIC_API_KEY') || '',
      google: process.env.GOOGLE_API_KEY || localStorage.getItem('GOOGLE_API_KEY') || '',
      groq: process.env.GROQ_API_KEY || localStorage.getItem('GROQ_API_KEY') || ''
    };
    
    // Save these default keys to localStorage for future use
    localStorage.setItem('apiKeys', JSON.stringify(defaultKeys));
    
    return defaultKeys;
  } catch (error) {
    console.error("[API Keys] Failed to get API keys:", error);
    return {};
  }
}

// Save API keys to local storage
export function saveApiKeys(keys: Record<string, string>) {
  try {
    localStorage.setItem('apiKeys', JSON.stringify(keys));
    return true;
  } catch (error) {
    console.error("[API Keys] Failed to save API keys:", error);
    return false;
  }
}