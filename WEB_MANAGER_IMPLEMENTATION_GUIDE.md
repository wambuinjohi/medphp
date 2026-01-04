# Web Manager Admin Implementation Guide

## Overview
The Web Manager is an independent admin interface for managing the public website's product categories and variants. It's completely separate from the business logic tables and manages only the public interface.

---

## Phase 1: Database Setup

### Supabase Migration
Execute the migration file: `supabase/migrations/create_web_manager_tables.sql`

**Tables Created:**
- `web_categories` - Product categories for the website
- `web_variants` - Product variants/items within each category
- `web_categories_with_counts` - View for easy category display

**Key Features:**
- ✅ Row Level Security (RLS) - Public read, admin write
- ✅ Audit fields (created_by, updated_by)
- ✅ Display order for custom sorting
- ✅ Active/Inactive flags for visibility control
- ✅ Automatic timestamps

---

## Phase 2: Admin Menu Integration

### Location: `src/pages/Index.tsx`

Add "Web Manager" section to admin menu:

```typescript
// In the navigation/menu sidebar, add:
{
  icon: Globe, // lucide-react icon
  label: 'Web Manager',
  href: '/app/web-manager',
  badge: 'New',
  color: 'text-blue-600'
}
```

---

## Phase 3: Web Manager Components Structure

```
src/
├── pages/
│   └── WebManager.tsx (Main page)
├── components/
│   ├── web-manager/
│   │   ├── CategoriesTab.tsx
│   │   ├── VariantsTab.tsx
│   │   ├── CreateCategoryModal.tsx
│   │   ├── EditCategoryModal.tsx
│   │   ├── CreateVariantModal.tsx
│   │   ├── EditVariantModal.tsx
│   │   └── ImageUploadField.tsx
│   └── ...existing components
└── hooks/
    └── useWebManager.ts
```

---

## Phase 4: Web Manager Features

### 4.1 Main Page Layout
- **Tab Navigation**: Categories | Variants
- **Search & Filter**
- **Create New** buttons
- **Bulk Actions** (activate/deactivate)
- **Status Indicator** (active/inactive)

### 4.2 Categories Tab
**Features:**
- List all categories with variant counts
- Display order (drag-to-reorder)
- Icon picker
- Quick toggle active/inactive
- Edit/Delete actions
- Create new category

**Columns:**
- Name
- Slug
- Icon
- Variants Count
- Display Order
- Status
- Actions

**Modal Forms:**
- Category name (required)
- Slug (auto-generate from name)
- Icon emoji picker
- Description (optional)
- Display order (number)
- Is Active (toggle)

### 4.3 Variants Tab
**Features:**
- Filter by category
- List variants with thumbnail previews
- Quick status toggle
- Edit/Delete actions
- Create new variant
- Image upload with preview

**Columns:**
- SKU
- Name
- Category
- Image (thumbnail)
- Display Order
- Status
- Actions

**Modal Forms:**
- Category dropdown (required)
- Variant name (required)
- SKU (required, unique)
- Slug (auto-generate)
- Description (optional)
- Image upload field
- Display order (number)
- Is Active (toggle)

---

## Phase 5: File Upload Strategy

### Image Storage
- **Location**: `/public/products/` directory
- **Format**: JPEG, PNG
- **Naming**: `{category-slug}-{variant-slug}.{ext}`
- **No Supabase storage** - Use local file system only

### Upload Process
1. User selects image in WebManager UI
2. Image uploaded to `/public/products/` via FormData
3. Store relative path in database: `/products/category-slug-variant-slug.jpg`
4. Display preview using local path

### Implementation
```typescript
// src/components/web-manager/ImageUploadField.tsx
- Accept image files
- Show preview
- Delete option
- File size validation (max 5MB)
- Auto-name based on variant name
```

---

## Phase 6: Hooks & Services

### `src/hooks/useWebManager.ts`
```typescript
export const useWebManager = () => {
  // Categories
  const fetchCategories = async (search?: string, limit?: number)
  const createCategory = async (data: CategoryFormData)
  const updateCategory = async (id: string, data: CategoryFormData)
  const deleteCategory = async (id: string)
  const reorderCategories = async (categories: ReorderData[])
  
  // Variants
  const fetchVariants = async (categoryId?: string, search?: string)
  const createVariant = async (data: VariantFormData)
  const updateVariant = async (id: string, data: VariantFormData)
  const deleteVariant = async (id: string)
  
  // Status management
  const toggleCategoryStatus = async (id: string, isActive: boolean)
  const toggleVariantStatus = async (id: string, isActive: boolean)
}
```

---

## Phase 7: Integration with Public Pages

### Pages to Update
1. **ProductDetail.tsx**
   - Fetch variants from `web_variants` instead of hardcoded data
   - Fetch category from `web_categories`

2. **ProductCategorySidebar.tsx**
   - Fetch categories from `web_categories`
   - Filter by `is_active = true`

3. **Landing.tsx** (Products Dropdown)
   - Fetch from `web_categories`
   - Build dropdown menu dynamically

4. **OurProducts.tsx**
   - Fetch categories from `web_categories`
   - Display in grid

### Database Query Utilities
```typescript
// src/services/webManager.ts
export const webManagerService = {
  // Public queries (used by frontend)
  getActiveCategories: () => supabase
    .from('web_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order'),
    
  getCategoryWithVariants: (slug: string) => supabase
    .from('web_categories')
    .select('*, web_variants(*)')
    .eq('slug', slug)
    .eq('is_active', true),
    
  // Admin queries
  getAllCategories: () => supabase
    .from('web_categories_with_counts')
    .select('*')
    .order('display_order'),
}
```

---

## Phase 8: Admin Permissions

### User Role Check
```typescript
// Check if user is admin
const isAdmin = user?.user_metadata?.role === 'admin'

// Protect Web Manager page
<ProtectedRoute requiredRole="admin">
  <WebManager />
</ProtectedRoute>
```

---

## Phase 9: UI/UX Considerations

### Design Patterns
- **Responsive**: Works on desktop/tablet
- **Real-time feedback**: Toast notifications for actions
- **Confirmation dialogs**: Before delete operations
- **Drag-to-reorder**: For display order
- **Keyboard shortcuts**: Tab navigation, Enter to save
- **Auto-save**: Debounced updates
- **Optimistic updates**: UI updates before server response

### Error Handling
- Network errors
- Validation errors
- Permission denied
- Duplicate SKU/slug
- File upload errors

---

## Phase 10: Testing Checklist

- [ ] Create category with all fields
- [ ] Edit category details
- [ ] Delete category (cascade to variants)
- [ ] Create variant with image upload
- [ ] Edit variant details
- [ ] Delete variant
- [ ] Toggle active/inactive
- [ ] Reorder categories
- [ ] Search/filter functionality
- [ ] Image upload validation
- [ ] Public pages update dynamically
- [ ] RLS policies work correctly
- [ ] Admin-only access works

---

## Implementation Order

1. **Week 1**: Database + Service layer
2. **Week 2**: Admin UI components + Forms
3. **Week 3**: Image upload + Reorder functionality
4. **Week 4**: Integration with public pages
5. **Week 5**: Testing + Bug fixes

---

## API Endpoints (Backend Required)

If you want server-side image handling:

```
POST /api/web-manager/upload - Upload image to /public/products
GET /api/web-manager/categories - List categories
POST /api/web-manager/categories - Create category
PUT /api/web-manager/categories/:id - Update category
DELETE /api/web-manager/categories/:id - Delete category

GET /api/web-manager/variants - List variants
POST /api/web-manager/variants - Create variant
PUT /api/web-manager/variants/:id - Update variant
DELETE /api/web-manager/variants/:id - Delete variant
```

---

## Notes

- ✅ Completely independent from business tables
- ✅ Images stored locally in `/public/products/`
- ✅ RLS ensures only admins can write
- ✅ Public read access for website display
- ✅ No additional services required
- ✅ Scalable to multiple pages/sections
