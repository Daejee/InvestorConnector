import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CompanyForm from "@/components/companies/company-form";
import { Plus, Search, Upload, Download, FileText, Edit, Archive, Trash2, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Company } from "@shared/schema";

export default function Companies() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const filteredCompanies = companies?.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.hqLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.type.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => parseFloat(b.aum) - parseFloat(a.aum)) || [];

  const uploadCSVMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csvFile', file);
      
      const response = await fetch('/api/companies/upload-csv', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Server error details:', error);
        // Pass the full error object for better error handling
        const errorObj = new Error(error.message || 'Upload failed');
        (errorObj as any).details = error;
        throw errorObj;
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setUploadResult(data);
      toast({
        title: "Success",
        description: data.message,
      });
    },
    onError: (error: any) => {
      console.error('CSV upload error:', error);
      setUploadResult(error.details || { message: error.message, errors: [] });
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: number) => {
      const response = await apiRequest("DELETE", `/api/companies/${companyId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Success",
        description: "Company deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete company",
        variant: "destructive",
      });
    },
  });

  const archiveCompanyMutation = useMutation({
    mutationFn: async (companyId: number) => {
      const response = await apiRequest("PUT", `/api/companies/${companyId}/archive`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Success",
        description: "Company archived successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive company",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      uploadCSVMutation.mutate(file);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['Company Name', 'HQ Location', 'AUM', 'Type', 'Area'],
      ['BOCOM International Asset Management', 'Hong Kong', '85', 'China Fixed Income, Equity', 'Hong Kong'],
      ['China Southern Asset Management (HK)', 'Hong Kong', '90', 'China Mutual Funds, ETFs', 'Hong Kong'],
      ['CICC Asset Management (HK)', 'Hong Kong', '110', 'Institutional, China Equities', 'Hong Kong'],
    ];
    
    // Properly escape CSV fields that contain commas
    const escapeCsvField = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };
    
    const csvContent = sampleData.map(row => 
      row.map(field => escapeCsvField(field)).join(',')
    ).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'companies_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading companies...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Companies</h2>
            <p className="text-gray-600 mt-1">Manage company information and fund details</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Button variant="outline" onClick={downloadSampleCSV}>
              <Download className="mr-2 h-4 w-4" />
              Sample CSV
            </Button>
            
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Companies from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload a CSV file with the following columns:
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-medium text-gray-900 mb-3">CSV Format Requirements:</p>
                      <div className="space-y-4">
                        <div>
                          <strong>Required Headers (first row):</strong>
                          <p className="text-sm text-gray-600 mt-1 font-mono bg-white p-2 rounded border">
                            Company Name,HQ Location,AUM,Type,Area
                          </p>
                        </div>
                        <div>
                          <strong>Example Data Row:</strong>
                          <p className="text-sm text-gray-600 mt-1 font-mono bg-white p-2 rounded border">
                            HSBC Asset Management,Hong Kong,620,"Institutional, ESG",Hong Kong
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <strong>Notes:</strong>
                            <ul className="mt-2 space-y-1 text-sm text-gray-600">
                              <li>• AUM values should be in billions</li>
                              <li>• Use quotes for multi-word types</li>
                              <li>• Headers are case-insensitive</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Area Options:</strong>
                            <ul className="mt-2 space-y-1 text-sm text-gray-600">
                              <li>• US • EU • Hong Kong</li>
                              <li>• Singapore • Korea • Other</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Click to select a CSV file or drag and drop
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadCSVMutation.isPending}
                      >
                        {uploadCSVMutation.isPending ? "Uploading..." : "Select CSV File"}
                      </Button>
                    </div>
                  </div>

                  {uploadResult && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-3">
                          <p className="font-medium">{uploadResult.message}</p>
                          
                          {uploadResult.detectedHeaders && (
                            <div className="bg-blue-50 p-3 rounded">
                              <p className="text-sm font-medium text-blue-800 mb-2">Detected CSV Headers:</p>
                              <p className="text-sm text-blue-700">{uploadResult.detectedHeaders.join(', ')}</p>
                            </div>
                          )}
                          
                          {uploadResult.expectedFormat && (
                            <div className="bg-green-50 p-3 rounded">
                              <p className="text-sm font-medium text-green-800 mb-2">Expected Format:</p>
                              <p className="text-sm text-green-700 mb-2">Required columns: {uploadResult.expectedFormat.requiredColumns.join(', ')}</p>
                              <details className="text-sm text-green-700">
                                <summary className="cursor-pointer font-medium">Accepted column name variations</summary>
                                <div className="mt-2 space-y-1">
                                  {Object.entries(uploadResult.expectedFormat.acceptedVariations).map(([field, variations]: [string, any]) => (
                                    <div key={field}>
                                      <strong>{field}:</strong> {variations.join(', ')}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          )}
                          
                          {uploadResult.errors && uploadResult.errors.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                              <ul className="text-sm text-red-600 space-y-1">
                                {uploadResult.errors.slice(0, 5).map((error: string, index: number) => (
                                  <li key={index}>• {error}</li>
                                ))}
                                {uploadResult.errors.length > 5 && (
                                  <li>... and {uploadResult.errors.length - 5} more errors</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Company
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Company</DialogTitle>
                </DialogHeader>
                <CompanyForm 
                  onSuccess={() => setIsDialogOpen(false)}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Companies</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCompanies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No companies found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompanies.map((company) => (
                <Card key={company.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{company.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{company.type}</p>
                        <p className="text-sm text-gray-500 mb-1">📍 {company.hqLocation}</p>
                        <p className="text-sm text-gray-500 mb-2">🌍 {company.area || 'US'}</p>
                        <p className="text-sm font-medium">
                          AUM (Bil): ${(parseFloat(company.aum) / 1000000000).toFixed(1)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setEditingCompany(company);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => archiveCompanyMutation.mutate(company.id)}
                            disabled={archiveCompanyMutation.isPending}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this company? This action cannot be undone.")) {
                                deleteCompanyMutation.mutate(company.id);
                              }
                            }}
                            disabled={deleteCompanyMutation.isPending}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Company Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          {editingCompany && (
            <CompanyForm 
              company={editingCompany}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setEditingCompany(null);
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingCompany(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
