import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Building2, DollarSign, TrendingUp, Upload, Download, FileText } from "lucide-react";
import FundForm from "@/components/funds/fund-form";
import { type Fund, type Company } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Funds() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);

  const { data: funds = [], isLoading } = useQuery<Fund[]>({
    queryKey: ["/api/funds"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const deleteFundMutation = useMutation({
    mutationFn: async (fundId: number) => {
      const response = await apiRequest("DELETE", `/api/funds/${fundId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funds"] });
      toast({
        title: "Success",
        description: "Fund deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete fund",
        variant: "destructive",
      });
    },
  });

  const uploadCSVMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/funds/upload-csv', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/funds"] });
      toast({
        title: "Success",
        description: data.message,
      });
      setIsUploadDialogOpen(false);
    },
    onError: (error: Error) => {
      console.error('CSV upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getCompanyName = (companyId: number) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || "Unknown Company";
  };

  const formatAum = (aum: string) => {
    const aumValue = parseFloat(aum);
    if (isNaN(aumValue)) return "N/A";
    return `$${aumValue.toFixed(1)}B`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Value": return "bg-blue-100 text-blue-800";
      case "Growth": return "bg-green-100 text-green-800";
      case "GARP": return "bg-purple-100 text-purple-800";
      case "Index": return "bg-orange-100 text-orange-800";
      case "Other": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['Fund Name', 'Company', 'AUM', 'Type', 'Own Our Shares', 'Share Amount'],
      ['HSBC Asia Pacific Equity Fund', 'HSBC Global Asset Management', '5.2', 'Growth', 'Yes', '2.5%'],
      ['Value Partners China Fund', 'Value Partners Group', '3.8', 'Value', 'No', ''],
      ['Harvest China Bond Fund', 'Harvest Global Investments', '2.1', 'Other', 'Yes', '1.2%'],
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
    a.download = 'funds_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      uploadCSVMutation.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading funds...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Funds / 펀드</h2>

          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Button variant="outline" onClick={downloadSampleCSV}>
              <Download className="mr-2 h-4 w-4" />
              Sample CSV / 샘플 CSV
            </Button>
            
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV / CSV 업로드
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Funds from CSV / CSV로 펀드 업로드</DialogTitle>
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
                            Fund Name,Company,AUM,Type
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Optional: Own Our Shares,Share Amount
                          </p>
                        </div>
                        <div>
                          <strong>Example Data Row:</strong>
                          <p className="text-sm text-gray-600 mt-1 font-mono bg-white p-2 rounded border">
                            HSBC Asia Fund,HSBC Global Asset Management,5.2,Growth,Yes,2.5%
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <strong>Notes:</strong>
                            <ul className="mt-2 space-y-1 text-sm text-gray-600">
                              <li>• Company must exist in your company list</li>
                              <li>• AUM values should be in billions</li>
                              <li>• Own Our Shares: Yes/No</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Type Options:</strong>
                            <ul className="mt-2 space-y-1 text-sm text-gray-600">
                              <li>• Value • Growth • GARP</li>
                              <li>• Index • Other</li>
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
                        Choose a CSV file to upload
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={uploadCSVMutation.isPending}
                      />
                      {uploadCSVMutation.isPending && (
                        <p className="text-sm text-blue-600">Uploading...</p>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Fund
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Fund</DialogTitle>
                </DialogHeader>
                <FundForm 
                  onSuccess={handleFormSuccess}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funds</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funds.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${funds.reduce((sum, fund) => sum + (parseFloat(fund.aum) || 0), 0).toFixed(1)}B
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Own Our Shares</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {funds.filter(fund => fund.ownOurShares).length}
            </div>
            <p className="text-xs text-muted-foreground">
              funds hold our shares
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fund Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          {funds.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No funds found</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first fund.</p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Fund
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Fund</DialogTitle>
                  </DialogHeader>
                  <FundForm 
                    onSuccess={handleFormSuccess}
                    onCancel={() => setIsDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>AUM</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Own Our Shares</TableHead>
                  <TableHead>Share Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funds.map((fund) => (
                  <TableRow key={fund.id}>
                    <TableCell className="font-medium">{fund.name}</TableCell>
                    <TableCell>{getCompanyName(fund.companyId)}</TableCell>
                    <TableCell>{formatAum(fund.aum)}</TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(fund.type)}>
                        {fund.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fund.ownOurShares ? "default" : "secondary"}>
                        {fund.ownOurShares ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {fund.ownOurShares && fund.shareAmount ? fund.shareAmount : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEditingFund(fund);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteFundMutation.mutate(fund.id)}
                          disabled={deleteFundMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Fund Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fund</DialogTitle>
          </DialogHeader>
          {editingFund && (
            <FundForm 
              fund={editingFund}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setEditingFund(null);
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingFund(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}