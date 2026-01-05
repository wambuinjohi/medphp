import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * PaymentAllocationStatus Component (DISABLED)
 * Supabase RPC functions are not available with external MySQL API
 * Payment allocation must be handled through API endpoints instead
 * 
 * To implement payment allocation:
 * 1. Use src/integrations/database/external-api-adapter.ts
 * 2. Create custom payment allocation endpoints in med.wayrus.co.ke/api.php
 * 3. Call via apiClient.selectOne('payment_allocations') or similar
 */
export function PaymentAllocationStatus() {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Payment Allocation Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Supabase RPC Functions Disabled</strong>
            <br />
            This component used PostgreSQL RPC functions which are not available with the external MySQL API.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">
              ✅ Current Configuration:
            </h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
              <li>Using direct external API integration (med.wayrus.co.ke)</li>
              <li>MySQL database for data storage</li>
              <li>No RPC/stored procedure support</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700 mb-2">
              📋 For Payment Allocation Features:
            </h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
              <li>Create custom API endpoints in backend/api.php</li>
              <li>Handle payment-to-invoice allocation in PHP code</li>
              <li>Use apiClient from src/integrations/api.ts for frontend calls</li>
              <li>Store allocation data in payment_allocations table</li>
            </ul>
          </div>

          <div className="bg-white rounded p-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Example API endpoint structure:
            </p>
            <code className="text-xs block text-gray-600 whitespace-pre-wrap">
{`// In backend/api.php
elseif ($action === "allocate_payment") {
  $payment_id = $_POST['payment_id'] ?? null;
  $invoice_id = $_POST['invoice_id'] ?? null;
  $amount = $_POST['amount'] ?? 0;
  
  // Insert into payment_allocations table
  $sql = "INSERT INTO payment_allocations 
          (payment_id, invoice_id, amount_allocated) 
          VALUES ('$payment_id', '$invoice_id', $amount)";
  // ... handle insert and return result
}`}
            </code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
