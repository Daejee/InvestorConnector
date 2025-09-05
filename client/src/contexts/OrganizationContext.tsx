import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';

interface Organization {
  id: number;
  name: string;
  domain: string;
  plan: string;
  status: string;
}

interface OrganizationContextType {
  organization: Organization | null;
  organizationId: number | null;
  isLoading: boolean;
  error: string | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

// Domain to Organization ID mapping
const DOMAIN_TO_ORG_ID: Record<string, number> = {
  'default': 1,
  'samsung': 2,
  'demo': 3,
};

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const extractOrgFromPath = () => {
      // Extract organization from URL: /org/samsung/dashboard -> 'samsung'
      const orgPathMatch = location.match(/^\/org\/([^\/]+)/);
      if (orgPathMatch) {
        return orgPathMatch[1];
      }
      
      // Extract organization from login URL: /login/demo -> 'demo'
      const loginPathMatch = location.match(/^\/login\/([^\/]+)/);
      if (loginPathMatch) {
        return loginPathMatch[1];
      }
      
      // Default to 'default' organization if no org in path
      return 'default';
    };

    const orgDomain = extractOrgFromPath();
    const newOrgId = DOMAIN_TO_ORG_ID[orgDomain] || 1;
    
    console.log("🔍 OrganizationContext:", { location, orgDomain, newOrgId, organizationId });
    
    
    // If organization changed, clear React Query caches only (preserve auth state)
    if (organizationId && organizationId !== newOrgId) {
      // Clear all React Query caches
      queryClient.clear();
    }

    const loadOrganization = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!newOrgId) {
          throw new Error(`Unknown organization: ${orgDomain}`);
        }


        // Fetch organization details from API
        const response = await fetch(`/api/organizations/${newOrgId}`);
        if (!response.ok) {
          throw new Error('Failed to load organization');
        }

        const orgData = await response.json();
        setOrganization(orgData);
        setOrganizationId(newOrgId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to default organization
        setOrganizationId(1);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganization();
  }, [location, organizationId]);

  return (
    <OrganizationContext.Provider value={{ organization, organizationId, isLoading, error }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}