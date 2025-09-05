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
      const pathMatch = location.match(/^\/org\/([^\/]+)/);
      if (pathMatch) {
        return pathMatch[1];
      }
      
      // Default to 'default' organization if no org in path
      return 'default';
    };

    const orgDomain = extractOrgFromPath();
    const newOrgId = DOMAIN_TO_ORG_ID[orgDomain] || 1;
    
    console.log('Current location:', location, 'Domain:', orgDomain, 'New org ID:', newOrgId, 'Current org ID:', organizationId);
    
    // If organization changed, clear all caches and force re-render
    if (organizationId && organizationId !== newOrgId) {
      console.log('🔄 Organization changed from', organizationId, 'to', newOrgId, 'clearing all caches');
      
      // Clear all React Query caches
      queryClient.clear();
      
      // Clear local storage to remove any cached state
      localStorage.clear();
      
      console.log('💾 All caches cleared, updating organization context');
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