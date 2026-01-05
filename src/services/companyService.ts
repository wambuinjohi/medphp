import { apiClient } from '@/integrations/api';

export interface CompanyData {
  id: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
  [key: string]: any;
}

/**
 * Fetch company information for public pages (login)
 * This uses the external PHP API instead of Supabase
 */
export async function fetchPublicCompanyData(): Promise<CompanyData | null> {
  try {
    const result = await apiClient.select('companies', {});

    if (!result.data || result.error) {
      console.warn('Failed to fetch company data:', result.error?.message);
      return null;
    }

    // Get first company from the list
    const companies = Array.isArray(result.data) ? result.data : [result.data];
    const company = companies[0];

    if (!company) {
      console.warn('No companies found');
      return null;
    }

    return {
      id: company.id,
      name: company.name,
      logo_url: company.logo_url,
      primary_color: company.primary_color,
      ...company
    } as CompanyData;
  } catch (error) {
    console.error('Error fetching company data:', error);
    return null;
  }
}
