import { supabase } from '@/integrations/supabase/client';

export interface CompanyData {
  id: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
  [key: string]: any;
}

/**
 * Fetch company information for public pages (login)
 * This uses a direct Supabase query with public read access
 */
export async function fetchPublicCompanyData(): Promise<CompanyData | null> {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, logo_url, primary_color')
      .limit(1)
      .single();

    if (error) {
      console.warn('Failed to fetch company data:', error.message);
      return null;
    }

    return data as CompanyData;
  } catch (error) {
    console.error('Error fetching company data:', error);
    return null;
  }
}
