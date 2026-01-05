import { apiClient } from '@/integrations/api';

export type TableCheckResult = {
  exists: boolean;
  companyCount: number;
  message: string;
};

export async function checkTaxSettingsTable(): Promise<TableCheckResult> {
  console.log('Checking if tax_settings table exists via external API...');

  try {
    // Check if we can read from tax_settings table via external API
    const result = await apiClient.select('tax_settings', {});

    if (!result.error) {
      console.log('✅ tax_settings table is accessible via API');
      return {
        exists: true,
        companyCount: 0,
        message: 'tax_settings table already exists and is ready to use!'
      };
    }

    console.log('⚠️ tax_settings table not accessible, checking company count...');

    // Get company data to show how many companies will need tax settings
    const companiesResult = await apiClient.select('companies', {});

    if (companiesResult.error || !companiesResult.data) {
      throw new Error(`Cannot access companies table: ${companiesResult.error?.message || 'Unknown error'}`);
    }

    const companies = Array.isArray(companiesResult.data) ? companiesResult.data : [companiesResult.data];
    const companyCount = companies?.length || 0;
    console.log(`✅ Found ${companyCount} companies that will need tax settings`);

    return {
      exists: false,
      companyCount,
      message: `The tax_settings table needs to be created. Found ${companyCount} company(ies) that will need default tax settings.`
    };

  } catch (error) {
    console.error('❌ Failed to check tax settings table:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`Failed to check tax settings: ${errorMessage}`);
  }
}

export async function insertDefaultTaxSettings(): Promise<void> {
  console.log('Inserting default tax settings...');
  
  try {
    // Get all companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id');
    
    if (companiesError) {
      throw new Error(`Cannot access companies: ${companiesError.message}`);
    }
    
    if (!companies || companies.length === 0) {
      console.log('No companies found, skipping tax settings creation');
      return;
    }
    
    // Insert default tax settings for each company
    for (const company of companies) {
      console.log(`Creating tax settings for company ${company.id}...`);
      
      const defaultTaxSettings = [
        {
          company_id: company.id,
          name: 'VAT',
          rate: 16.0,
          is_active: true,
          is_default: true
        },
        {
          company_id: company.id,
          name: 'Zero Rated',
          rate: 0.0,
          is_active: true,
          is_default: false
        },
        {
          company_id: company.id,
          name: 'Exempt',
          rate: 0.0,
          is_active: true,
          is_default: false
        }
      ];
      
      const { error: insertError } = await supabase
        .from('tax_settings')
        .insert(defaultTaxSettings);
      
      if (insertError) {
        throw new Error(`Failed to insert tax settings for company ${company.id}: ${insertError.message}`);
      }
      
      console.log(`✅ Tax settings created for company ${company.id}`);
    }
    
    console.log('✅ Default tax settings inserted successfully!');
    
  } catch (error) {
    console.error('�� Failed to insert default tax settings:', error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`Failed to insert default tax settings: ${errorMessage}`);
  }
}
