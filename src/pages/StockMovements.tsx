import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Search,
  Filter,
  Download,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Package,
  Calendar,
} from 'lucide-react';
import { useStockMovements, useProducts } from '@/hooks/useDatabase';
import { useCurrentCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

interface StockMovement {
  id: string;
  product_id?: string;
  movement_type: string;
  reference_type?: string;
  reference_id?: string;
  quantity: number;
  cost_per_unit?: number;
  notes?: string;
  movement_date?: string;
  created_at?: string;
  product?: {
    name: string;
    sku: string;
  };
  created_by?: number;
}

function getMovementTypeBadge(type: string) {
  switch (type) {
    case 'in':
      return <Badge className="bg-success-light text-success border-success/20 flex items-center gap-1"><TrendingUp className="h-3 w-3" />In</Badge>;
    case 'out':
      return <Badge className="bg-destructive-light text-destructive border-destructive/20 flex items-center gap-1"><TrendingDown className="h-3 w-3" />Out</Badge>;
    case 'adjustment':
      return <Badge className="bg-warning-light text-warning border-warning/20 flex items-center gap-1"><RefreshCw className="h-3 w-3" />Adjustment</Badge>;
    case 'return':
      return <Badge className="bg-secondary-light text-secondary border-secondary/20">Return</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

function getReferenceTypeBadge(type?: string) {
  if (!type) return '-';
  switch (type) {
    case 'invoice':
      return <Badge variant="outline" className="text-xs">Invoice</Badge>;
    case 'proforma':
      return <Badge variant="outline" className="text-xs">Proforma</Badge>;
    case 'credit_note':
      return <Badge variant="outline" className="text-xs">Credit Note</Badge>;
    case 'delivery_note':
      return <Badge variant="outline" className="text-xs">Delivery</Badge>;
    case 'adjustment':
      return <Badge variant="outline" className="text-xs">Adjustment</Badge>;
    case 'manual':
      return <Badge variant="outline" className="text-xs">Manual</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>;
  }
}

export default function StockMovements() {
  const [searchTerm, setSearchTerm] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  const { currentCompany, isLoading: isCompanyLoading } = useCurrentCompany();
  const DEFAULT_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440000';
  const activeCompanyId = currentCompany?.id || DEFAULT_COMPANY_ID;

  const { data: movements, isLoading: isMovementsLoading, error } = useStockMovements(activeCompanyId);
  const { data: products, isLoading: isProductsLoading } = useProducts(activeCompanyId);

  const isLoading = isCompanyLoading || isMovementsLoading || isProductsLoading;

  // Filter and search logic
  const filteredMovements = useMemo(() => {
    return movements?.filter(movement => {
      // Search filter
      const matchesSearch =
        (movement.product?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (movement.product?.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (movement.reference_id?.toString()?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (movement.notes?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      // Movement type filter
      const matchesMovementType = movementTypeFilter === 'all' || movement.movement_type === movementTypeFilter;

      // Product filter
      const matchesProduct = productFilter === 'all' || movement.product_id?.toString() === productFilter;

      // Date filters
      let matchesDateFrom = true;
      let matchesDateTo = true;

      if (dateFromFilter) {
        const filterDate = new Date(dateFromFilter).getTime();
        const movementDate = new Date(movement.movement_date || movement.created_at || '').getTime();
        matchesDateFrom = movementDate >= filterDate;
      }

      if (dateToFilter) {
        const filterDate = new Date(dateToFilter).getTime();
        const movementDate = new Date(movement.movement_date || movement.created_at || '').getTime();
        matchesDateTo = movementDate <= filterDate;
      }

      return matchesSearch && matchesMovementType && matchesProduct && matchesDateFrom && matchesDateTo;
    }) || [];
  }, [movements, searchTerm, movementTypeFilter, productFilter, dateFromFilter, dateToFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!filteredMovements || filteredMovements.length === 0) {
      return { inTotal: 0, outTotal: 0, adjustmentTotal: 0, costTotal: 0 };
    }

    const inTotal = filteredMovements.reduce((sum, m) => m.movement_type === 'in' ? sum + (typeof m.quantity === 'number' ? m.quantity : 0) : sum, 0);
    const outTotal = filteredMovements.reduce((sum, m) => m.movement_type === 'out' ? sum + (typeof m.quantity === 'number' ? m.quantity : 0) : sum, 0);
    const adjustmentTotal = filteredMovements.reduce((sum, m) => m.movement_type === 'adjustment' ? sum + Math.abs(typeof m.quantity === 'number' ? m.quantity : 0) : sum, 0);
    const costTotal = filteredMovements.reduce((sum, m) => {
      const cost = typeof m.cost_per_unit === 'number' ? m.cost_per_unit : 0;
      const qty = typeof m.quantity === 'number' ? m.quantity : 0;
      return sum + (cost * qty);
    }, 0);

    return { inTotal: Number(inTotal) || 0, outTotal: Number(outTotal) || 0, adjustmentTotal: Number(adjustmentTotal) || 0, costTotal: Number(costTotal) || 0 };
  }, [filteredMovements]);

  const [showFilters, setShowFilters] = useState(false);

  const handleClearFilters = () => {
    setSearchTerm('');
    setMovementTypeFilter('all');
    setProductFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    toast.success('Filters cleared');
  };

  const handleExportCSV = () => {
    if (filteredMovements.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Product', 'SKU', 'Movement Type', 'Reference Type', 'Quantity', 'Cost Per Unit', 'Total Cost', 'Notes'];
    const rows = filteredMovements.map(m => [
      m.movement_date || m.created_at || '',
      m.product?.name || 'Unknown',
      m.product?.sku || '',
      m.movement_type,
      m.reference_type || '-',
      m.quantity || 0,
      m.cost_per_unit || 0,
      ((m.cost_per_unit || 0) * (m.quantity || 0)).toFixed(2),
      m.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Stock movements exported successfully');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Stock Movements</h1>
            <p className="text-muted-foreground">Track inventory movements and adjustments</p>
          </div>
        </div>
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive">Error loading stock movements: {error.message}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stock Movements</h1>
          <p className="text-muted-foreground">
            Track all inventory movements and adjustments
          </p>
        </div>
        <Button
          className="gradient-primary text-primary-foreground hover:opacity-90 shadow-card"
          size="lg"
          onClick={handleExportCSV}
          disabled={filteredMovements.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Stock In</span>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{totals.inTotal.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">units received</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Stock Out</span>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{totals.outTotal.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">units shipped</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Adjustments</span>
              <RefreshCw className="h-5 w-5 text-warning" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{totals.adjustmentTotal.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">units adjusted</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Cost Value</span>
              <Package className="h-5 w-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totals.costTotal)}</p>
            <p className="text-sm text-muted-foreground mt-1">total cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by product, SKU, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4 space-y-4">
                <div className="space-y-3">
                  <Label className="font-semibold">Movement Type</Label>
                  <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="in">Stock In</SelectItem>
                      <SelectItem value="out">Stock Out</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="font-semibold">Product</Label>
                  <Select value={productFilter} onValueChange={setProductFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      <SelectItem value="all">All Products</SelectItem>
                      {products?.map(product => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="font-semibold">Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Input
                        type="date"
                        value={dateFromFilter}
                        onChange={(e) => setDateFromFilter(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Input
                        type="date"
                        value={dateToFilter}
                        onChange={(e) => setDateToFilter(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </PopoverContent>
            </Popover>

            <div className="text-sm text-muted-foreground">
              {filteredMovements.length} movement{filteredMovements.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Movements Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No stock movements found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Date
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost/Unit</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm">{formatDate(movement.movement_date || movement.created_at || '')}</TableCell>
                      <TableCell className="font-medium">{movement.product?.name || 'Unknown'}</TableCell>
                      <TableCell className="font-mono text-sm">{movement.product?.sku || '-'}</TableCell>
                      <TableCell>{getMovementTypeBadge(movement.movement_type)}</TableCell>
                      <TableCell>{getReferenceTypeBadge(movement.reference_type)}</TableCell>
                      <TableCell className="text-right font-medium">{typeof movement.quantity === 'number' ? movement.quantity.toFixed(2) : '0.00'}</TableCell>
                      <TableCell className="text-right">{movement.cost_per_unit ? formatCurrency(movement.cost_per_unit) : '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency((movement.cost_per_unit || 0) * (movement.quantity || 0))}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{movement.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
