import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { usePayments, useRemittanceAdvice, useCompanies } from '@/hooks/useDatabase';
import { useInvoicesFixed as useInvoices } from '@/hooks/useInvoicesFixed';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

interface Activity {
  id: string;
  type: 'invoice' | 'payment' | 'remittance' | 'delivery';
  title: string;
  customer: string;
  amount?: string;
  status: 'completed' | 'pending' | 'overdue' | 'draft' | 'sent';
  timestamp: Date;
}

function getStatusColor(status: Activity['status']) {
  switch (status) {
    case 'completed':
    case 'sent':
      return 'bg-success-light text-success border-success/20';
    case 'pending':
      return 'bg-warning-light text-warning border-warning/20';
    case 'overdue':
      return 'bg-destructive-light text-destructive border-destructive/20';
    case 'draft':
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
    default:
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
  }
}

function getTypeIcon(type: Activity['type']) {
  switch (type) {
    case 'invoice':
      return 'IN';
    case 'payment':
      return 'PA';
    case 'remittance':
      return 'RA';
    case 'delivery':
      return 'DE';
    default:
      return 'AC';
  }
}

export function RecentActivity() {
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const currentCompany = companies?.[0];
  const { data: invoices, isLoading: invoicesLoading, error: invoicesError } = useInvoices(currentCompany?.id);
  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = usePayments(currentCompany?.id);
  const { data: remittances, isLoading: remittancesLoading, error: remittancesError } = useRemittanceAdvice(currentCompany?.id);

  // Timeout handling - if loading for more than 3 seconds, show empty state
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (!invoicesLoading && !paymentsLoading && !remittancesLoading) {
      setLoadingTimeout(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [invoicesLoading, paymentsLoading, remittancesLoading]);

  const isLoading = invoicesLoading || paymentsLoading || remittancesLoading;
  const hasError = invoicesError || paymentsError || remittancesError;
  const isLoadingTooLong = isLoading && loadingTimeout;

  // Check if we have no data at all
  const hasNoData = !invoices?.length && !payments?.length && !remittances?.length;

  const formatCurrency = useMemo(() => {
    return (amount: number) => {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };
  }, []);

  // Combine all activities - memoized to prevent unnecessary recalculation
  const activities: Activity[] = useMemo(() => {
    const combined: Activity[] = [];

    // Add invoices
    if (invoices) {
      invoices.slice(0, 3).forEach(invoice => {
        combined.push({
          id: `invoice-${invoice.id}`,
          type: 'invoice',
          title: `Invoice ${invoice.invoice_number}`,
          customer: invoice.customers?.name || 'Unknown Customer',
          amount: formatCurrency(invoice.total_amount || 0),
          status: invoice.status as Activity['status'],
          timestamp: new Date(invoice.created_at || '')
        });
      });
    }

    // Add payments
    if (payments) {
      payments.slice(0, 2).forEach(payment => {
        combined.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: `Payment ${payment.payment_number}`,
          customer: payment.customers?.name || 'Unknown Customer',
          amount: formatCurrency(payment.amount || 0),
          status: 'completed',
          timestamp: new Date(payment.created_at || '')
        });
      });
    }

    // Add remittance advice
    if (remittances) {
      remittances.slice(0, 1).forEach(remittance => {
        combined.push({
          id: `remittance-${remittance.id}`,
          type: 'remittance',
          title: `Remittance ${remittance.advice_number}`,
          customer: remittance.customers?.name || 'Unknown Customer',
          amount: formatCurrency(remittance.total_payment || 0),
          status: remittance.status as Activity['status'],
          timestamp: new Date(remittance.created_at || '')
        });
      });
    }

    // Sort by timestamp (most recent first)
    combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return combined;
  }, [invoices, payments, remittances, formatCurrency]);

  if (hasError && !isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Unable to load recent activity. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if loading is taking too long OR we have no data and are no longer loading
  if (isLoadingTooLong || (hasNoData && !isLoading && !companiesLoading)) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start creating invoices, payments, or quotations to see activity here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start creating invoices, payments, or quotations to see activity here
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg hover:bg-muted/50 transition-smooth cursor-pointer">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {getTypeIcon(activity.type)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2 sm:space-y-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  {activity.amount && (
                    <span className="text-sm font-semibold text-foreground">
                      {activity.amount}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-xs text-muted-foreground truncate">{activity.customer}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(activity.status)}>
                      {activity.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        {activities.length > 0 && (
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing latest activity • {activities.length} recent items
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
