-- ============================================================================
-- COMBINED COMPREHENSIVE MIGRATION
-- This migration consolidates all database schema changes into a single file
-- for easier deployment and management.
-- ============================================================================

-- ============================================================================
-- 1. CREATE EXTENSIONS (if not exists)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. CREATE ENUMS
-- ============================================================================
CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'stock_manager', 'user', 'super_admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE lpo_status AS ENUM ('draft', 'sent', 'approved', 'received', 'cancelled');
CREATE TYPE document_status AS ENUM ('draft', 'sent', 'approved', 'partial', 'paid', 'overdue', 'cancelled');

-- ============================================================================
-- 3. CREATE CORE TABLES
-- ============================================================================

-- Companies table (Multi-company support)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#FF8C42',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name)
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    tax_id VARCHAR(50),
    customer_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    credit_limit DECIMAL(15,2) DEFAULT 0,
    is_supplier BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, customer_number)
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(255),
    payment_terms VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product categories
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Products/Inventory table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    unit_of_measure VARCHAR(50),
    stock_quantity DECIMAL(10,3) DEFAULT 0,
    reorder_level DECIMAL(10,3) DEFAULT 0,
    unit_price DECIMAL(15,2) NOT NULL,
    cost_price DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tax settings table
CREATE TABLE IF NOT EXISTS tax_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(6,3) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    quotation_number VARCHAR(100) UNIQUE NOT NULL,
    quotation_date DATE DEFAULT CURRENT_DATE,
    validity_date DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    terms_and_conditions TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotation items
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    tax_inclusive BOOLEAN DEFAULT FALSE,
    tax_setting_id UUID REFERENCES tax_settings(id),
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    balance_due DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    terms_and_conditions TEXT,
    lpo_number VARCHAR(255),
    status document_status DEFAULT 'draft',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    tax_inclusive BOOLEAN DEFAULT FALSE,
    discount_before_vat DECIMAL(15,2) DEFAULT 0,
    tax_setting_id UUID REFERENCES tax_settings(id),
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Proforma invoices table
CREATE TABLE IF NOT EXISTS proforma_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    proforma_number VARCHAR(100) UNIQUE NOT NULL,
    proforma_date DATE DEFAULT CURRENT_DATE,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    terms_and_conditions TEXT,
    status document_status DEFAULT 'draft',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proforma invoice items
CREATE TABLE IF NOT EXISTS proforma_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proforma_id UUID NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    tax_inclusive BOOLEAN DEFAULT FALSE,
    tax_setting_id UUID REFERENCES tax_settings(id),
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Delivery notes table
CREATE TABLE IF NOT EXISTS delivery_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    delivery_note_number VARCHAR(100) UNIQUE NOT NULL,
    delivery_date DATE DEFAULT CURRENT_DATE,
    delivery_method VARCHAR(50),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery note items
CREATE TABLE IF NOT EXISTS delivery_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_of_measure VARCHAR(50) DEFAULT 'pieces',
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50),
    amount DECIMAL(15,2) NOT NULL,
    reference_number VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment allocations (linking payments to invoices)
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    UNIQUE(payment_id, invoice_id)
);

-- Payment audit log
CREATE TABLE IF NOT EXISTS payment_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    old_paid_amount DECIMAL(15,2),
    new_paid_amount DECIMAL(15,2),
    old_balance_due DECIMAL(15,2),
    new_balance_due DECIMAL(15,2),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50),
    reference_number VARCHAR(255),
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Remittance advice table
CREATE TABLE IF NOT EXISTS remittance_advice (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    remittance_number VARCHAR(100) UNIQUE NOT NULL,
    remittance_date DATE DEFAULT CURRENT_DATE,
    total_amount DECIMAL(15,2) DEFAULT 0,
    payment_method VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Remittance advice items
CREATE TABLE IF NOT EXISTS remittance_advice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    remittance_id UUID NOT NULL REFERENCES remittance_advice(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100),
    invoice_date DATE,
    amount DECIMAL(15,2) NOT NULL,
    tax_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    tax_inclusive BOOLEAN DEFAULT FALSE,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    reference_type VARCHAR(50) CHECK (reference_type IN ('INVOICE', 'DELIVERY_NOTE', 'RESTOCK', 'ADJUSTMENT', 'CREDIT_NOTE', 'PURCHASE')),
    reference_id UUID,
    quantity DECIMAL(10,3) NOT NULL,
    cost_per_unit DECIMAL(15,2),
    notes TEXT,
    movement_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LPO (Local Purchase Order) tables
CREATE TABLE IF NOT EXISTS lpos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lpo_number VARCHAR(100) UNIQUE NOT NULL,
    lpo_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    status lpo_status DEFAULT 'draft',
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    terms_and_conditions TEXT,
    delivery_address TEXT,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LPO items table
CREATE TABLE IF NOT EXISTS lpo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lpo_id UUID NOT NULL REFERENCES lpos(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    unit_of_measure VARCHAR(50) DEFAULT 'pieces',
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Web categories table (for public store)
CREATE TABLE IF NOT EXISTS web_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    icon VARCHAR(50),
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Web variants table (for public store)
CREATE TABLE IF NOT EXISTS web_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES web_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    image_path VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, sku)
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    status user_status DEFAULT 'pending',
    phone TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    department TEXT,
    position TEXT,
    password TEXT,
    auth_user_id UUID,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission_name TEXT NOT NULL,
    granted BOOLEAN DEFAULT TRUE,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_name)
);

-- User invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    role user_role DEFAULT 'user',
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    invitation_token UUID DEFAULT uuid_generate_v4(),
    UNIQUE(email, company_id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    record_id UUID,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_email TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration logs table
CREATE TABLE IF NOT EXISTS migration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT
);

-- Customer number sequence
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 1;

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_customer_number ON customers(company_id, customer_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Tax settings indexes
CREATE INDEX IF NOT EXISTS idx_tax_settings_company_id ON tax_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_settings_active ON tax_settings(company_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_settings_unique_default ON tax_settings(company_id) WHERE is_default = TRUE;

-- Quotations indexes
CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Proforma invoices indexes
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_company_id ON proforma_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_customer_id ON proforma_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_proforma_invoices_number ON proforma_invoices(proforma_number);

-- Delivery notes indexes
CREATE INDEX IF NOT EXISTS idx_delivery_notes_company_id ON delivery_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_customer_id ON delivery_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_invoice_id ON delivery_notes(invoice_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- Payment audit log indexes
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_payment_id ON payment_audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_invoice_id ON payment_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_action ON payment_audit_log(action);

-- Stock movements indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_product_date ON stock_movements(company_id, product_id, movement_date);

-- LPO indexes
CREATE INDEX IF NOT EXISTS idx_lpos_company_id ON lpos(company_id);
CREATE INDEX IF NOT EXISTS idx_lpos_supplier_id ON lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lpos_lpo_number ON lpos(lpo_number);
CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos(status);
CREATE INDEX IF NOT EXISTS idx_lpo_items_lpo_id ON lpo_items(lpo_id);
CREATE INDEX IF NOT EXISTS idx_lpo_items_product_id ON lpo_items(product_id);

-- Web categories and variants indexes
CREATE INDEX IF NOT EXISTS idx_web_categories_slug ON web_categories(slug);
CREATE INDEX IF NOT EXISTS idx_web_categories_is_active ON web_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_web_categories_display_order ON web_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_web_variants_category_id ON web_variants(category_id);
CREATE INDEX IF NOT EXISTS idx_web_variants_slug ON web_variants(slug);
CREATE INDEX IF NOT EXISTS idx_web_variants_sku ON web_variants(sku);
CREATE INDEX IF NOT EXISTS idx_web_variants_is_active ON web_variants(is_active);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- User permissions indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_name ON user_permissions(permission_name);

-- User invitations indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_is_approved ON user_invitations(is_approved);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);

-- ============================================================================
-- 5. CREATE FUNCTIONS
-- ============================================================================

-- Updated timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated timestamp function for audit logs
CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE(permission_name TEXT, granted BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT up.permission_name, up.granted
    FROM user_permissions up
    WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has permission
CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN DEFAULT FALSE;
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val
    FROM profiles
    WHERE id = user_uuid;

    IF user_role_val = 'admin' OR user_role_val = 'super_admin' THEN
        RETURN TRUE;
    END IF;

    SELECT COALESCE(granted, FALSE) INTO has_perm
    FROM user_permissions
    WHERE user_id = user_uuid AND permission_name = permission;

    RETURN has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate proforma number
CREATE OR REPLACE FUNCTION generate_proforma_number(company_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
    next_number INTEGER;
    year_part VARCHAR(4);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(proforma_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM proforma_invoices 
    WHERE company_id = company_uuid 
    AND proforma_number LIKE 'PF-' || year_part || '-%';
    
    RETURN 'PF-' || year_part || '-' || LPAD(next_number::VARCHAR, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate LPO number
CREATE OR REPLACE FUNCTION generate_lpo_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    company_code TEXT;
    lpo_count INTEGER;
    lpo_number TEXT;
BEGIN
    SELECT COALESCE(UPPER(LEFT(name, 3)), 'LPO') INTO company_code
    FROM companies 
    WHERE id = company_uuid;
    
    SELECT COUNT(*) INTO lpo_count
    FROM lpos
    WHERE company_id = company_uuid;
    
    lpo_number := company_code || '-LPO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((lpo_count + 1)::TEXT, 4, '0');
    
    RETURN lpo_number;
END;
$$ LANGUAGE plpgsql;

-- Update product stock core function
CREATE OR REPLACE FUNCTION public.update_product_stock_core(
    p_product_uuid UUID,
    p_movement_type TEXT,
    p_quantity NUMERIC
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rows_updated INTEGER := 0;
BEGIN
  p_movement_type := UPPER(p_movement_type);
  IF p_movement_type NOT IN ('IN','OUT','ADJUSTMENT') THEN
    RAISE EXCEPTION 'Invalid movement_type: %', p_movement_type;
  END IF;

  IF p_movement_type = 'IN' THEN
    UPDATE products
    SET stock_quantity = COALESCE(stock_quantity,0) + p_quantity,
        updated_at = NOW()
    WHERE id = p_product_uuid;
  ELSIF p_movement_type = 'OUT' THEN
    UPDATE products
    SET stock_quantity = GREATEST(COALESCE(stock_quantity,0) - p_quantity, 0),
        updated_at = NOW()
    WHERE id = p_product_uuid;
  ELSIF p_movement_type = 'ADJUSTMENT' THEN
    UPDATE products
    SET stock_quantity = p_quantity,
        updated_at = NOW()
    WHERE id = p_product_uuid;
  END IF;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RETURN json_build_object('success', false, 'error', format('Product %s not found', p_product_uuid));
  END IF;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update product stock wrapper
CREATE OR REPLACE FUNCTION public.update_product_stock(
    product_uuid UUID,
    movement_type TEXT,
    quantity NUMERIC
) RETURNS JSON LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT public.update_product_stock_core(product_uuid, movement_type, quantity);
$$;

-- Update product stock wrapper (alternate order)
CREATE OR REPLACE FUNCTION public.update_product_stock(
    movement_type TEXT,
    product_uuid UUID,
    quantity NUMERIC
) RETURNS JSON LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT public.update_product_stock_core(product_uuid, movement_type, quantity);
$$;

-- Update product stock with integer quantity
CREATE OR REPLACE FUNCTION public.update_product_stock(
    product_uuid UUID,
    movement_type TEXT,
    quantity INTEGER
) RETURNS JSON LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT public.update_product_stock_core(product_uuid, movement_type, quantity::NUMERIC);
$$;

-- Update product stock with integer quantity (alternate order)
CREATE OR REPLACE FUNCTION public.update_product_stock(
    movement_type TEXT,
    product_uuid UUID,
    quantity INTEGER
) RETURNS JSON LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT public.update_product_stock_core(product_uuid, movement_type, quantity::NUMERIC);
$$;

-- Log user creation
CREATE OR REPLACE FUNCTION log_user_creation(
    p_invited_email TEXT,
    p_invited_role TEXT,
    p_company_id UUID
)
RETURNS void AS $$
BEGIN
    INSERT INTO audit_logs (
        action,
        entity_type,
        company_id,
        actor_user_id,
        actor_email,
        details
    ) VALUES (
        'CREATE',
        'user_creation',
        p_company_id,
        auth.uid(),
        (SELECT email FROM profiles WHERE id = auth.uid()),
        jsonb_build_object(
            'invited_email', p_invited_email,
            'invited_role', p_invited_role
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log user approval
CREATE OR REPLACE FUNCTION log_user_approval(
    p_user_id UUID,
    p_approval_status TEXT,
    p_company_id UUID
)
RETURNS void AS $$
BEGIN
    INSERT INTO audit_logs (
        action,
        entity_type,
        record_id,
        company_id,
        actor_user_id,
        actor_email,
        details
    ) VALUES (
        'APPROVE',
        'user_approval',
        p_user_id,
        p_company_id,
        auth.uid(),
        (SELECT email FROM profiles WHERE id = auth.uid()),
        jsonb_build_object(
            'user_email', (SELECT email FROM profiles WHERE id = p_user_id),
            'approval_status', p_approval_status
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log user invitation
CREATE OR REPLACE FUNCTION log_user_invitation(
    p_invited_email TEXT,
    p_invited_role TEXT,
    p_company_id UUID
)
RETURNS void AS $$
BEGIN
    INSERT INTO audit_logs (
        action,
        entity_type,
        company_id,
        actor_user_id,
        actor_email,
        details
    ) VALUES (
        'INVITE',
        'user_invitation',
        p_company_id,
        auth.uid(),
        (SELECT email FROM profiles WHERE id = auth.uid()),
        jsonb_build_object(
            'invited_email', p_invited_email,
            'invited_role', p_invited_role
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create SECURITY DEFINER functions for admin checks (fix RLS recursion)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID, check_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND role IN ('admin', 'super_admin')
        AND (check_company_id IS NULL OR company_id = check_company_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_active_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 6. CREATE TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_settings_updated_at BEFORE UPDATE ON tax_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proforma_invoices_updated_at BEFORE UPDATE ON proforma_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_notes_updated_at BEFORE UPDATE ON delivery_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remittance_advice_updated_at BEFORE UPDATE ON remittance_advice
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_movements_updated_at BEFORE UPDATE ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lpos_updated_at BEFORE UPDATE ON lpos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_web_categories_updated_at BEFORE UPDATE ON web_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_web_variants_updated_at BEFORE UPDATE ON web_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_logs_updated_at BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION update_audit_logs_updated_at();

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE remittance_advice ENABLE ROW LEVEL SECURITY;
ALTER TABLE remittance_advice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lpos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lpo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. CREATE ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- ===== Companies Policies =====
CREATE POLICY "Public can read companies" ON companies
    FOR SELECT USING (true);

CREATE POLICY "Users can read their company" ON companies
    FOR SELECT USING (
        id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Admins can update their company" ON companies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'super_admin')
            AND p.company_id = companies.id
        )
    );

-- ===== Customers Policies =====
CREATE POLICY "Users can view customers in their company" ON customers
    FOR SELECT USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert customers in their company" ON customers
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update customers in their company" ON customers
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- ===== Products Policies =====
CREATE POLICY "Users can view products in their company" ON products
    FOR SELECT USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert products in their company" ON products
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update products in their company" ON products
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- ===== Tax Settings Policies =====
CREATE POLICY "Users can view tax settings in their company" ON tax_settings
    FOR SELECT USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage tax settings in their company" ON tax_settings
    FOR ALL USING (
        is_admin(auth.uid(), company_id)
    );

-- ===== Quotations Policies =====
CREATE POLICY "Users can view quotations in their company" ON quotations
    FOR SELECT USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert quotations in their company" ON quotations
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update quotations in their company" ON quotations
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete quotations in their company" ON quotations
    FOR DELETE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- ===== Quotation Items Policies =====
CREATE POLICY "Users can manage quotation items in their company" ON quotation_items
    FOR ALL USING (
        quotation_id IN (
            SELECT id FROM quotations
            WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

-- ===== Invoices Policies =====
CREATE POLICY "Users can view invoices in their company" ON invoices
    FOR SELECT USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert invoices in their company" ON invoices
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update invoices in their company" ON invoices
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete invoices in their company" ON invoices
    FOR DELETE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- ===== Invoice Items Policies =====
CREATE POLICY "Users can manage invoice items in their company" ON invoice_items
    FOR ALL USING (
        invoice_id IN (
            SELECT id FROM invoices
            WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

-- ===== Proforma Invoices Policies =====
CREATE POLICY "Users can view proforma invoices in their company" ON proforma_invoices
    FOR SELECT USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert proforma invoices in their company" ON proforma_invoices
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update proforma invoices in their company" ON proforma_invoices
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete proforma invoices in their company" ON proforma_invoices
    FOR DELETE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- ===== Proforma Items Policies =====
CREATE POLICY "Users can manage proforma items in their company" ON proforma_items
    FOR ALL USING (
        proforma_id IN (
            SELECT id FROM proforma_invoices
            WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

-- ===== Delivery Notes Policies =====
CREATE POLICY "Users can view delivery notes in their company" ON delivery_notes
    FOR SELECT USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert delivery notes in their company" ON delivery_notes
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update delivery notes in their company" ON delivery_notes
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete delivery notes in their company" ON delivery_notes
    FOR DELETE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- ===== Delivery Note Items Policies =====
CREATE POLICY "Users can manage delivery note items in their company" ON delivery_note_items
    FOR ALL USING (
        delivery_note_id IN (
            SELECT id FROM delivery_notes
            WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

-- ===== Payments Policies =====
CREATE POLICY "Users can view payments in their company" ON payments
    FOR SELECT USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert payments in their company" ON payments
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update payments in their company" ON payments
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete payments in their company" ON payments
    FOR DELETE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- ===== Payment Allocations Policies =====
CREATE POLICY "Users can manage payment allocations in their company" ON payment_allocations
    FOR ALL USING (
        payment_id IN (
            SELECT id FROM payments
            WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

-- ===== Payment Audit Log Policies =====
CREATE POLICY "Users can view payment audit logs in their company" ON payment_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = payment_audit_log.invoice_id
            AND i.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can insert payment audit logs in their company" ON payment_audit_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.id = payment_audit_log.invoice_id
            AND i.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

-- ===== Remittance Advice Policies =====
CREATE POLICY "Users can view remittance advice in their company" ON remittance_advice
    FOR SELECT USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert remittance advice in their company" ON remittance_advice
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update remittance advice in their company" ON remittance_advice
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- ===== Remittance Advice Items Policies =====
CREATE POLICY "Users can manage remittance advice items in their company" ON remittance_advice_items
    FOR ALL USING (
        remittance_id IN (
            SELECT id FROM remittance_advice
            WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

-- ===== Stock Movements Policies =====
CREATE POLICY "Users can view stock movements in their company" ON stock_movements
    FOR SELECT USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert stock movements in their company" ON stock_movements
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update stock movements in their company" ON stock_movements
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete stock movements in their company" ON stock_movements
    FOR DELETE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- ===== LPOs Policies =====
CREATE POLICY "Users can view lpos in their company" ON lpos
    FOR SELECT USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert lpos in their company" ON lpo
    FOR INSERT WITH CHECK (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update lpos in their company" ON lpos
    FOR UPDATE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can delete lpos in their company" ON lpos
    FOR DELETE USING (
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- ===== LPO Items Policies =====
CREATE POLICY "Users can manage lpo items in their company" ON lpo_items
    FOR ALL USING (
        lpo_id IN (
            SELECT id FROM lpos
            WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
        )
    );

-- ===== Web Categories Policies =====
CREATE POLICY "Allow all access to web categories" ON web_categories
    FOR ALL USING (true) WITH CHECK (true);

-- ===== Web Variants Policies =====
CREATE POLICY "Allow all access to web variants" ON web_variants
    FOR ALL USING (true) WITH CHECK (true);

-- ===== Profiles Policies =====
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles in their company" ON profiles
    FOR SELECT USING (is_admin(auth.uid(), company_id));

CREATE POLICY "Admins can insert new profiles" ON profiles
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update profiles in their company" ON profiles
    FOR UPDATE USING (is_admin(auth.uid(), company_id));

CREATE POLICY "Public can view profiles that created documents" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quotations WHERE quotations.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM invoices WHERE invoices.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM proforma_invoices WHERE proforma_invoices.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM delivery_notes WHERE delivery_notes.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM payments WHERE payments.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM remittance_advice WHERE remittance_advice.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM stock_movements WHERE stock_movements.created_by = profiles.id
        )
    );

-- ===== User Permissions Policies =====
CREATE POLICY "Users can view their own permissions" ON user_permissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage permissions in their company" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            JOIN profiles user_profile ON user_profile.id = user_permissions.user_id
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role IN ('admin', 'super_admin')
            AND admin_profile.company_id = user_profile.company_id
        )
    );

-- ===== User Invitations Policies =====
CREATE POLICY "Admins can manage invitations for their company" ON user_invitations
    FOR ALL USING (
        is_admin(auth.uid(), company_id)
    );

-- ===== Audit Logs Policies =====
CREATE POLICY "Users can view audit logs for their company" ON audit_logs
    FOR SELECT USING (
        company_id IS NULL OR
        company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update audit logs" ON audit_logs
    FOR UPDATE USING (
        is_admin(auth.uid(), company_id)
    );

CREATE POLICY "Admins can delete audit logs" ON audit_logs
    FOR DELETE USING (
        is_admin(auth.uid(), company_id)
    );

-- ============================================================================
-- 9. INSERT DEFAULT DATA
-- ============================================================================

-- Insert default web categories
INSERT INTO web_categories (name, slug, icon, description, display_order, is_active) VALUES
('Bandages, Tapes and Dressings', 'bandages-tapes-and-dressings', '🩹', 'Medical dressings and bandages', 1, true),
('Bottles and Containers', 'bottles-and-containers', '🔵', 'Storage bottles and containers', 2, true),
('Catheters and Tubes', 'catheters-and-tubes', '🧪', 'Medical catheters and tubes', 3, true),
('Cotton Wool', 'cotton-wool', '☁️', 'Premium cotton wool products', 4, true),
('Diapers and Sanitary', 'diapers-and-sanitary', '👶', 'Diaper and sanitary products', 5, true),
('Gloves', 'gloves', '🧤', 'Medical gloves', 6, true),
('Hospital Equipments', 'hospital-equipments', '🖥️', 'Medical equipment', 7, true),
('Hospital Furniture', 'hospital-furniture', '🛏️', 'Hospital beds and furniture', 8, true),
('Hospital Instruments', 'hospital-instruments', '🔧', 'Surgical instruments', 9, true),
('Hospital Linen', 'hospital-linen', '👕', 'Hospital linens', 10, true),
('Infection Control', 'infection-control', '🛡️', 'Infection control products', 11, true),
('PPE', 'ppe', '⚠️', 'Personal protective equipment', 12, true),
('Spirits, Detergents and Disinfectants', 'spirits-detergents-disinfectants', '💧', 'Cleaning and disinfectant products', 13, true),
('Syringes and Needles', 'syringes-and-needles', '💉', 'Syringes and needles', 14, true),
('Others', 'others', '⋯', 'Other products', 15, true)
ON CONFLICT (name) DO NOTHING;

-- Insert sample web variants
INSERT INTO web_variants (category_id, name, sku, slug, description, display_order, is_active) 
SELECT id, 'Premium Cotton Wool', 'CW-001', 'premium-cotton-wool', 'High quality cotton wool 500g', 1, true 
FROM web_categories WHERE slug = 'cotton-wool'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO web_variants (category_id, name, sku, slug, description, display_order, is_active) 
SELECT id, 'Medical Grade Gloves', 'GL-001', 'medical-grade-gloves', 'Latex-free medical gloves - Box of 100', 1, true 
FROM web_categories WHERE slug = 'gloves'
ON CONFLICT (sku) DO NOTHING;

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.update_product_stock_core(UUID, TEXT, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_product_stock(UUID, TEXT, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_product_stock(TEXT, UUID, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_product_stock(UUID, TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_product_stock(TEXT, UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_admin(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_active_user(UUID) TO authenticated, anon;

-- ============================================================================
-- 11. MIGRATION LOG
-- ============================================================================

INSERT INTO migration_logs (migration_name, notes, status)
VALUES (
    'combined_complete_schema',
    'Combined all individual migrations into a single comprehensive migration for easier deployment',
    'completed'
) ON CONFLICT DO NOTHING;
