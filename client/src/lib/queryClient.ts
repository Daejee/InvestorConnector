import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Global domain mapping cache
let domainMappingCache: Record<string, number> | null = null;
let domainMappingCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to fetch domain mapping from backend
async function fetchDomainMapping(): Promise<Record<string, number>> {
  const now = Date.now();
  
  // Return cached mapping if still valid
  if (domainMappingCache && (now - domainMappingCacheTime) < CACHE_DURATION) {
    return domainMappingCache;
  }
  
  try {
    const response = await fetch("/api/domain-mapping", {
      credentials: "include",
    });
    
    if (response.ok) {
      domainMappingCache = await response.json();
      domainMappingCacheTime = now;
      console.log("🗺️ Domain mapping loaded:", domainMappingCache);
      return domainMappingCache;
    }
  } catch (error) {
    console.error("Failed to fetch domain mapping:", error);
  }
  
  // Fallback to static mapping if API fails
  const fallback = {
    'default': 1,
    'default.com': 1,
    'samsung': 2,
    'demo': 3,
    'LG': 4,
  };
  
  domainMappingCache = fallback;
  domainMappingCacheTime = now;
  return fallback;
}

// Function to get current organization ID from URL
function getCurrentOrganizationId(): number {
  const path = window.location.pathname;
  const orgMatch = path.match(/^\/org\/([^\/]+)/);
  if (orgMatch) {
    const domain = orgMatch[1];
    
    // Use cached domain mapping or fallback
    if (domainMappingCache) {
      return domainMappingCache[domain] || 1;
    }
    
    // Static fallback for immediate use
    const domainToOrgId: Record<string, number> = {
      'default': 1,
      'default.com': 1,
      'samsung': 2,
      'demo': 3,
      'LG': 4,
    };
    return domainToOrgId[domain] || 1;
  }
  return 1; // Default organization
}

// Initialize domain mapping on first API call
async function ensureDomainMapping() {
  if (!domainMappingCache) {
    await fetchDomainMapping();
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
): Promise<Response> {
  const { method = "GET", body, headers = {} } = options || {};
  await ensureDomainMapping();
  const organizationId = getCurrentOrganizationId();
  
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      "X-Organization-Id": organizationId.toString(),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const organizationId = getCurrentOrganizationId();
    
    const res = await fetch(queryKey[0] as string, {
      headers: {
        "X-Organization-Id": organizationId.toString(),
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Safe JSON parsing
    const text = await res.text();
    if (!text.trim()) {
      return null;
    }
    
    try {
      return JSON.parse(text);
    } catch (error) {
      console.error("JSON parsing error in queryClient:", error);
      console.error("Response URL:", res.url);
      console.error("Response status:", res.status);
      console.error("Response text:", text.substring(0, 200));
      // Don't throw error to prevent breaking the UI
      return null;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
