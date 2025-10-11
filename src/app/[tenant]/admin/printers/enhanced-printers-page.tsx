'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Printer, PrinterType } from '@/lib/types';
import { PrinterTestResult } from '@/lib/robust-printer-service';
import { 
  ClientPrinterService, 
  PrinterFormData, 
  PrinterStats, 
  DiscoveredPrinter 
} from '@/lib/client-printer-service';
import {
  Plus,
  Settings,
  Trash2,
  TestTube,
  Wifi,
  WifiOff,
  Activity,
  Search,
  RefreshCw,
  Printer as PrinterIcon,
  CheckCircle,
  XCircle,
  Clock,
  Network
} from 'lucide-react';

const initialFormData: PrinterFormData = {
  name: '',
  ipAddress: '',
  port: 9100,
  type: 'receipt',
  active: true,
};

const printerTypeOptions = [
  { value: 'kitchen', label: 'Kitchen Printer', icon: '🍳' },
  { value: 'receipt', label: 'Receipt Printer', icon: '🧾' },
  { value: 'bar', label: 'Bar Printer', icon: '🍺' },
  { value: 'dot-matrix', label: 'Dot Matrix', icon: '📄' },
  { value: 'label', label: 'Label Printer', icon: '🏷️' },
  { value: 'kitchen-display', label: 'Kitchen Display System', icon: '🖥️' },
];

export default function PrintersPage() {
  const { toast } = useToast();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [stats, setStats] = useState<PrinterStats>({
    totalPrinters: 0,
    activePrinters: 0,
    printerTypes: {},
    recentJobs: 0
  });
  const [formData, setFormData] = useState<PrinterFormData>(initialFormData);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: PrinterTestResult }>({});
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);

  // Get tenant ID from URL
  const tenantId = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : '';

  useEffect(() => {
    loadPrinters();
    loadStats();
  }, []);

  const loadPrinters = async () => {
    try {
      setLoading(true);
      const data = await ClientPrinterService.getTenantPrinters(tenantId);
      setPrinters(data);
    } catch (error) {
      console.error('Failed to load printers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load printers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await ClientPrinterService.getPrinterStats(tenantId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (editingPrinter) {
        await ClientPrinterService.updatePrinter(tenantId, editingPrinter.id, formData);
        toast({
          title: 'Success',
          description: 'Printer updated successfully',
        });
      } else {
        await ClientPrinterService.savePrinter(tenantId, formData);
        toast({
          title: 'Success',
          description: 'Printer added successfully',
        });
      }
      
      setShowForm(false);
      setFormData(initialFormData);
      setEditingPrinter(null);
      loadPrinters();
      loadStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save printer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (printer: Printer) => {
    setEditingPrinter(printer);
    setFormData({
      name: printer.name,
      ipAddress: printer.ipAddress,
      port: printer.port,
      type: printer.type,
      active: printer.active,
    });
    setShowForm(true);
  };

  const handleDelete = async (printerId: string) => {
    if (!confirm('Are you sure you want to delete this printer?')) return;
    
    try {
      setLoading(true);
      await ClientPrinterService.deletePrinter(tenantId, printerId);
      toast({
        title: 'Success',
        description: 'Printer deleted successfully',
      });
      loadPrinters();
      loadStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete printer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (printer: Printer) => {
    try {
      setTestingPrinter(printer.id);
      const result = await ClientPrinterService.testPrinterConnection(tenantId, printer.id);
      setTestResults(prev => ({ ...prev, [printer.id]: result }));
      
      toast({
        title: result.success ? 'Connection Successful' : 'Connection Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Test failed:', error);
      toast({
        title: 'Test Failed',
        description: 'Failed to test printer connection',
        variant: 'destructive',
      });
    } finally {
      setTestingPrinter(null);
    }
  };

  const handleDiscoverPrinters = async () => {
    try {
      setDiscovering(true);
      const discovered = await ClientPrinterService.discoverPrinters(tenantId);
      setDiscoveredPrinters(discovered);
      
      toast({
        title: 'Discovery Complete',
        description: `Found ${discovered.length} responsive printers`,
      });
    } catch (error) {
      console.error('Discovery failed:', error);
      toast({
        title: 'Discovery Failed',
        description: 'Failed to discover printers',
        variant: 'destructive',
      });
    } finally {
      setDiscovering(false);
    }
  };

  const addDiscoveredPrinter = (ip: string, port: number) => {
    setFormData({
      ...initialFormData,
      ipAddress: ip,
      port: port,
      name: `Printer ${ip}:${port}`,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setFormData(initialFormData);
    setEditingPrinter(null);
  };

  const getStatusBadge = (printer: Printer) => {
    const testResult = testResults[printer.id];
    
    if (testResult) {
      return (
        <Badge variant={testResult.success ? 'default' : 'destructive'} className="flex items-center gap-1">
          {testResult.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {testResult.success ? 'Connected' : 'Disconnected'}
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Unknown
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Printer Management</h1>
          <p className="text-gray-600">Manage your IP printers and print settings</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Printer
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Printers</CardTitle>
            <PrinterIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPrinters}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Printers</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activePrinters}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Printer Types</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.printerTypes).length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentJobs}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="printers" className="w-full">
        <TabsList>
          <TabsTrigger value="printers">Printers</TabsTrigger>
          <TabsTrigger value="discovery">Network Discovery</TabsTrigger>
        </TabsList>
        
        <TabsContent value="printers">
          {/* Printer Form */}
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  {editingPrinter ? 'Edit Printer' : 'Add New Printer'}
                </CardTitle>
                <CardDescription>
                  Configure your IP printer settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Printer Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Kitchen Printer 1"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="type">Printer Type</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value: PrinterType) => setFormData(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {printerTypeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.icon} {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="ipAddress">IP Address</Label>
                      <Input
                        id="ipAddress"
                        value={formData.ipAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, ipAddress: e.target.value }))}
                        placeholder="192.168.1.100"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="port">Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={formData.port}
                        onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                        placeholder="9100"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : editingPrinter ? 'Update' : 'Add'} Printer
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Printers List */}
          <div className="grid gap-4">
            {printers.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-gray-500">
                    <PrinterIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No printers configured yet.</p>
                    <p className="text-sm">Add your first printer to get started.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              printers.map(printer => (
                <Card key={printer.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {printerTypeOptions.find(opt => opt.value === printer.type)?.icon}
                          {printer.name}
                        </CardTitle>
                        <CardDescription>
                          {printer.ipAddress}:{printer.port} • {printer.type}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(printer)}
                        <Badge variant={printer.active ? 'default' : 'secondary'}>
                          {printer.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Network className="h-4 w-4" />
                          {printer.ipAddress}:{printer.port}
                        </span>
                        {testResults[printer.id] && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {testResults[printer.id].responseTime}ms
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(printer)}
                          disabled={testingPrinter === printer.id}
                        >
                          <TestTube className="h-4 w-4" />
                          {testingPrinter === printer.id ? 'Testing...' : 'Test'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(printer)}
                        >
                          <Settings className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(printer.id)}
                          className="text-red-600 hover:text-white hover:bg-red-600 border-red-300 hover:border-red-600 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="discovery">
          <Card>
            <CardHeader>
              <CardTitle>Network Printer Discovery</CardTitle>
              <CardDescription>
                Automatically discover IP printers on your network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={handleDiscoverPrinters}
                  disabled={discovering}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  {discovering ? 'Discovering...' : 'Discover Printers'}
                </Button>
                
                {discovering && (
                  <Alert>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Scanning network for printers... This may take a few minutes.
                    </AlertDescription>
                  </Alert>
                )}
                
                {discoveredPrinters.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Discovered Printers:</h4>
                    {discoveredPrinters.map((printer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <span className="font-medium">{printer.ip}:{printer.port}</span>
                          <Badge variant="outline" className="ml-2">
                            {printer.responsive ? 'Responsive' : 'Not Responsive'}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addDiscoveredPrinter(printer.ip, printer.port)}
                          disabled={!printer.responsive}
                        >
                          Add Printer
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
