# Backend API Implementation Guide

## Overview

This guide explains how to implement API endpoints in `public/api.php` and `backend/api.php` to replace the Supabase RPC functions that are no longer available.

## ✅ Already Implemented

The following basic endpoints are already working:

| Action | Endpoint | Method | Parameters |
|--------|----------|--------|------------|
| login | `?action=login` | POST | email, password |
| check_auth | `?action=check_auth` | POST | token |
| health | `?action=health` | GET | - |
| read | `?action=read&table=NAME` | GET | table, id, where |
| create | `?action=create&table=NAME` | POST | table, data |
| update | `?action=update&table=NAME` | POST | table, id, data |
| delete | `?action=delete&table=NAME` | POST | table, id |

## ⚠️ Missing - Need Implementation

### 1. Number Generation Endpoints

#### Invoice Number Generation

**What it does**: Generates unique invoice numbers in format `INV-2025-0001`

**Frontend Usage**:
```typescript
const result = await apiClient.query('invoices')
  .select()
  .single();

// OR call via action
const response = await fetch(
  `${API_URL}?action=generate_invoice_number`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: companyId })
  }
);
const { invoice_number } = await response.json();
```

**PHP Implementation**:
```php
elseif ($action === "generate_invoice_number") {
    $company_id = $_POST['company_id'] ?? ($json_body['company_id'] ?? null);
    if (!$company_id) {
        throw new Exception("Missing company_id");
    }

    $year = date('Y');
    
    // Get the highest invoice number for this year
    $sql = "SELECT invoice_number FROM invoices 
            WHERE company_id = '$company_id' 
            AND YEAR(created_at) = $year 
            ORDER BY created_at DESC LIMIT 1";
    
    $result = $conn->query($sql);
    $next_num = 1;
    
    if ($row = $result->fetch_assoc()) {
        // Parse number from existing invoice
        preg_match('/INV-\d+-(\d+)/', $row['invoice_number'], $matches);
        if ($matches) {
            $next_num = intval($matches[1]) + 1;
        }
    }
    
    $invoice_number = sprintf('INV-%d-%04d', $year, $next_num);
    
    echo json_encode([
        'status' => 'success',
        'invoice_number' => $invoice_number
    ]);
}
```

#### Quotation Number Generation

**PHP Implementation**:
```php
elseif ($action === "generate_quotation_number") {
    $company_id = $_POST['company_id'] ?? ($json_body['company_id'] ?? null);
    $year = date('Y');
    
    $sql = "SELECT COUNT(*) as count FROM quotations 
            WHERE company_id = '$company_id' 
            AND YEAR(created_at) = $year";
    
    $result = $conn->query($sql);
    $row = $result->fetch_assoc();
    $next_num = ($row['count'] ?? 0) + 1;
    
    $quotation_number = sprintf('QT-%d-%03d', $year, $next_num);
    
    echo json_encode([
        'status' => 'success',
        'quotation_number' => $quotation_number
    ]);
}
```

#### Proforma Number Generation

**PHP Implementation**:
```php
elseif ($action === "generate_proforma_number") {
    $company_id = $_POST['company_id'] ?? ($json_body['company_id'] ?? null);
    $year = date('Y');
    
    $sql = "SELECT COUNT(*) as count FROM proforma_invoices 
            WHERE company_id = '$company_id' 
            AND YEAR(created_at) = $year";
    
    $result = $conn->query($sql);
    $row = $result->fetch_assoc();
    $next_num = ($row['count'] ?? 0) + 1;
    
    $proforma_number = sprintf('PF-%d-%03d', $year, $next_num);
    
    echo json_encode([
        'status' => 'success',
        'proforma_number' => $proforma_number
    ]);
}
```

#### Credit Note Number Generation

**PHP Implementation**:
```php
elseif ($action === "generate_credit_note_number") {
    $company_id = $_POST['company_id'] ?? ($json_body['company_id'] ?? null);
    
    $sql = "SELECT COUNT(*) as count FROM credit_notes 
            WHERE company_id = '$company_id'";
    
    $result = $conn->query($sql);
    $row = $result->fetch_assoc();
    $next_num = ($row['count'] ?? 0) + 1;
    
    $credit_note_number = sprintf('CN%06d', $next_num);
    
    echo json_encode([
        'status' => 'success',
        'credit_note_number' => $credit_note_number
    ]);
}
```

### 2. Payment Allocation Endpoint

**What it does**: Records a payment and allocates it to an invoice

**Frontend Usage**:
```typescript
const result = await fetch(`${API_URL}?action=allocate_payment`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    payment_id: paymentId,
    invoice_id: invoiceId,
    amount: allocationAmount
  })
});
const { success, message } = await result.json();
```

**PHP Implementation**:
```php
elseif ($action === "allocate_payment") {
    $payment_id = $_POST['payment_id'] ?? ($json_body['payment_id'] ?? null);
    $invoice_id = $_POST['invoice_id'] ?? ($json_body['invoice_id'] ?? null);
    $amount = $_POST['amount'] ?? ($json_body['amount'] ?? 0);
    
    if (!$payment_id || !$invoice_id) {
        throw new Exception("Missing payment_id or invoice_id");
    }
    
    // Verify payment exists
    $check_payment = $conn->query("SELECT id FROM payments WHERE id = '$payment_id'");
    if ($check_payment->num_rows === 0) {
        throw new Exception("Payment not found");
    }
    
    // Verify invoice exists
    $check_invoice = $conn->query("SELECT total_amount, paid_amount FROM invoices WHERE id = '$invoice_id'");
    if ($check_invoice->num_rows === 0) {
        throw new Exception("Invoice not found");
    }
    
    $invoice = $check_invoice->fetch_assoc();
    $new_paid = ($invoice['paid_amount'] ?? 0) + $amount;
    
    // Insert allocation
    $sql = "INSERT INTO payment_allocations (payment_id, invoice_id, amount_allocated)
            VALUES ('$payment_id', '$invoice_id', $amount)";
    
    if (!$conn->query($sql)) {
        throw new Exception("Allocation failed: " . $conn->error);
    }
    
    // Update invoice
    $balance = $invoice['total_amount'] - $new_paid;
    $status = $new_paid >= $invoice['total_amount'] ? 'paid' : 'partial';
    
    $update_sql = "UPDATE invoices 
                   SET paid_amount = $new_paid,
                       balance_due = $balance,
                       status = '$status'
                   WHERE id = '$invoice_id'";
    
    $conn->query($update_sql);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Payment allocated',
        'amount_allocated' => $amount,
        'invoice_balance' => $balance
    ]);
}
```

### 3. Stock Movement Update Endpoint

**What it does**: Updates product stock levels based on movements

**Frontend Usage**:
```typescript
const result = await fetch(`${API_URL}?action=update_product_stock`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: productId,
    movement_type: 'IN', // or 'OUT', 'ADJUSTMENT'
    quantity: 10,
    reference_type: 'INVOICE'
  })
});
```

**PHP Implementation**:
```php
elseif ($action === "update_product_stock") {
    $product_id = $_POST['product_id'] ?? ($json_body['product_id'] ?? null);
    $movement_type = $_POST['movement_type'] ?? ($json_body['movement_type'] ?? 'OUT');
    $quantity = $_POST['quantity'] ?? ($json_body['quantity'] ?? 0);
    $reference_type = $_POST['reference_type'] ?? ($json_body['reference_type'] ?? 'MANUAL');
    $reference_id = $_POST['reference_id'] ?? ($json_body['reference_id'] ?? null);
    
    if (!$product_id) {
        throw new Exception("Missing product_id");
    }
    
    // Get current stock
    $result = $conn->query("SELECT stock_quantity FROM products WHERE id = '$product_id'");
    if ($result->num_rows === 0) {
        throw new Exception("Product not found");
    }
    
    $product = $result->fetch_assoc();
    $current_stock = $product['stock_quantity'] ?? 0;
    
    // Calculate new stock
    if ($movement_type === 'IN') {
        $new_stock = $current_stock + $quantity;
    } elseif ($movement_type === 'OUT') {
        $new_stock = max(0, $current_stock - $quantity);
    } else { // ADJUSTMENT
        $new_stock = $quantity;
    }
    
    // Update product stock
    $update_sql = "UPDATE products SET stock_quantity = $new_stock WHERE id = '$product_id'";
    
    if (!$conn->query($update_sql)) {
        throw new Exception("Stock update failed: " . $conn->error);
    }
    
    // Record movement
    $now = date('Y-m-d H:i:s');
    $movement_sql = "INSERT INTO stock_movements 
                     (product_id, movement_type, quantity, reference_type, reference_id, created_at)
                     VALUES ('$product_id', '$movement_type', $quantity, '$reference_type', '$reference_id', '$now')";
    
    $conn->query($movement_sql);
    
    echo json_encode([
        'status' => 'success',
        'previous_stock' => $current_stock,
        'new_stock' => $new_stock,
        'quantity_moved' => $quantity
    ]);
}
```

### 4. File Upload Endpoint

**What it does**: Handles file uploads to `/uploads` directory

**Frontend Usage**: Already implemented in `src/utils/directFileUpload.ts`

**PHP Implementation**:
```php
elseif ($action === "upload") {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Upload requires POST");
    }
    
    if (!isset($_FILES['file'])) {
        throw new Exception("No file provided");
    }
    
    $file = $_FILES['file'];
    $table = $_POST['table'] ?? 'general';
    $record_id = $_POST['record_id'] ?? '';
    
    // Validate file
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("File upload error: " . $file['error']);
    }
    
    // Create uploads directory if needed
    $upload_dir = __DIR__ . '/../uploads/' . $table;
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }
    
    // Generate unique filename
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('file_') . '_' . time() . '.' . $ext;
    $filepath = $upload_dir . '/' . $filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception("Failed to save file");
    }
    
    $public_path = "uploads/{$table}/{$filename}";
    $url = "https://med.wayrus.co.ke/{$public_path}";
    
    echo json_encode([
        'status' => 'success',
        'url' => $url,
        'path' => $public_path,
        'filename' => $filename,
        'size' => filesize($filepath)
    ]);
}
```

### 5. Delete File Endpoint

**PHP Implementation**:
```php
elseif ($action === "delete_file") {
    $path = $_POST['path'] ?? ($json_body['path'] ?? null);
    
    if (!$path) {
        throw new Exception("Missing file path");
    }
    
    // Security: prevent directory traversal
    if (strpos($path, '..') !== false || strpos($path, '/') === 0) {
        throw new Exception("Invalid file path");
    }
    
    $filepath = __DIR__ . '/../' . $path;
    
    if (!file_exists($filepath)) {
        throw new Exception("File not found");
    }
    
    if (!unlink($filepath)) {
        throw new Exception("Failed to delete file");
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'File deleted'
    ]);
}
```

## Integration Steps

### 1. Add endpoints to `public/api.php`

Copy the PHP implementations above into the appropriate sections of `public/api.php`, before the final `else` clause.

### 2. Test each endpoint

```bash
# Test invoice number generation
curl -X POST https://med.wayrus.co.ke/api.php?action=generate_invoice_number \
  -H "Content-Type: application/json" \
  -d '{"company_id":"1"}'

# Test payment allocation
curl -X POST https://med.wayrus.co.ke/api.php?action=allocate_payment \
  -H "Content-Type: application/json" \
  -d '{"payment_id":"1","invoice_id":"1","amount":"100"}'
```

### 3. Update Frontend Hooks

Once backend endpoints are implemented, update hooks like `useQuotationItems.ts` to use the new API:

**Before (RPC)**:
```typescript
const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number', {
  company_uuid: quotation.company_id
});
```

**After (API)**:
```typescript
const response = await fetch(`${API_URL}?action=generate_invoice_number`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ company_id: quotation.company_id })
});
const { invoice_number } = await response.json();
```

## Error Handling

All endpoints should follow this pattern:

```php
try {
    // ... endpoint logic ...
    echo json_encode(['status' => 'success', 'data' => $data]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
```

## Frontend Error Handling

Use the new error handler in `src/utils/rpcErrorHandler.ts`:

```typescript
import { callRPCWithFallback, RPCFallbacks } from '@/utils/rpcErrorHandler';

const result = await callRPCWithFallback(
  () => fetch(`${API_URL}?action=generate_invoice_number`),
  {
    functionName: 'generate_invoice_number',
    fallbackValue: RPCFallbacks.generateInvoiceNumber(),
    onError: (error) => console.warn('Number generation failed:', error)
  }
);

if (!result.isRPCAvailable) {
  // Use fallback
  invoiceNumber = result.data;
} else {
  invoiceNumber = result.data;
}
```

## Priority Implementation Order

1. **Number Generation** (high priority - affects document creation)
   - `generate_invoice_number`
   - `generate_quotation_number`
   - `generate_proforma_number`

2. **File Upload** (medium priority - already has frontend handler)
   - `upload`
   - `delete_file`

3. **Payment & Stock** (medium priority - optional features)
   - `allocate_payment`
   - `update_product_stock`

## Testing Checklist

- [ ] All number generation endpoints working
- [ ] File uploads to `/uploads` directory working
- [ ] Payment allocation updates invoice balance correctly
- [ ] Stock movements tracked and reflected in product quantities
- [ ] Error responses follow standard format
- [ ] Frontend gracefully handles missing endpoints
- [ ] Fallback values work when endpoints unavailable

---

For more information, see:
- `RPC_REMOVAL_AND_CLEANUP_SUMMARY.md`
- `src/utils/rpcErrorHandler.ts`
- `src/components/RPCErrorBoundary.tsx`
