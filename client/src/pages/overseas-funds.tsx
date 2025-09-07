import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Building2, DollarSign, TrendingUp, Upload, Download, FileText } from "lucide-react";
import OverseasFundForm from "../components/funds/overseas-fund-form";
import { type OverseasFund, type OverseasCompany } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function OverseasFunds() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<OverseasFund | null>(null);

  const { data: funds = [], isLoading } = useQuery<OverseasFund[]>({
    queryKey: ["/api/overseas-funds"],
  });

  const { data: companies = [] } = useQuery<OverseasCompany[]>({
    queryKey: ["/api/overseas-companies"],
  });

  const deleteFundMutation = useMutation({
    mutationFn: async (fundId: number) => {
      return await apiRequest("DELETE", `/api/overseas-funds/${fundId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overseas-funds"] });
      toast({
        title: "삭제 완료",
        description: "해외펀드가 성공적으로 삭제되었습니다",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "해외펀드 삭제에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const uploadCSVMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Get organization ID from URL path
      const path = window.location.pathname;
      const orgMatch = path.match(/^\/org\/([^\/]+)/);
      let organizationId = '1'; // default
      if (orgMatch) {
        const domain = orgMatch[1];
        const domainToOrgId: Record<string, number> = {
          'default': 1,
          'default.com': 1,
          'samsung': 2,
          'demo': 3,
          'LG': 4,
        };
        organizationId = (domainToOrgId[domain] || 1).toString();
      }
      
      const response = await fetch('/api/overseas-funds/upload-csv', {
        method: 'POST',
        headers: {
          'X-Organization-Id': organizationId,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/overseas-funds"] });
      toast({
        title: "업로드 완료",
        description: data.message,
      });
      setIsUploadDialogOpen(false);
    },
    onError: (error: Error) => {
      console.error('CSV upload error:', error);
      toast({
        title: "업로드 실패",
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
      ['Fidelity China Focus Fund', 'Fidelity International', '5.2', 'Growth', 'Yes', '2.5%'],
      ['BlackRock Asia Pacific Equity Fund', 'BlackRock', '3.8', 'Value', 'No', ''],
      ['Aberdeen Greater China Fund', 'Abrdn', '2.1', 'Other', 'Yes', '1.2%'],
    ];
    
    const escapeCsvField = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent = sampleData.map(row => 
      row.map(field => escapeCsvField(field.toString())).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'overseas_funds_sample.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadCSVMutation.mutate(file);
    }
    event.target.value = '';
  };

  const handleEdit = (fund: OverseasFund) => {
    setEditingFund(fund);
    setIsEditDialogOpen(true);
  };

  const handleEditFormSuccess = () => {
    setEditingFund(null);
    setIsEditDialogOpen(false);
  };

  const handleDelete = (fund: OverseasFund) => {
    if (window.confirm(`정말로 "${fund.name}" 해외펀드를 삭제하시겠습니까?`)) {
      deleteFundMutation.mutate(fund.id);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">해외펀드 관리</h1>
        <div className="flex gap-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                CSV 업로드
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>해외펀드 CSV 업로드</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  CSV 파일을 업로드하여 여러 해외펀드를 한 번에 추가할 수 있습니다.
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadSampleCSV}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    샘플 CSV 다운로드
                  </Button>
                  <span className="text-xs text-gray-500">
                    형식을 확인하려면 샘플을 다운로드하세요
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV 파일 선택
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 
                             file:mr-4 file:py-2 file:px-4 
                             file:rounded-md file:border-0 
                             file:text-sm file:font-semibold 
                             file:bg-blue-50 file:text-blue-700 
                             hover:file:bg-blue-100"
                    disabled={uploadCSVMutation.isPending}
                  />
                </div>
                {uploadCSVMutation.isPending && (
                  <div className="text-sm text-blue-600">업로드 중...</div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                해외펀드 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>해외펀드 추가</DialogTitle>
              </DialogHeader>
              <OverseasFundForm onSuccess={handleFormSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 해외펀드</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funds.length}</div>
            <p className="text-xs text-muted-foreground">등록된 해외펀드 수</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">보유 해외펀드</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {funds.filter(f => f.ownOurShares).length}
            </div>
            <p className="text-xs text-muted-foreground">자사 주식을 보유한 펀드</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 AUM</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${funds.reduce((sum, fund) => {
                const aumValue = parseFloat(fund.aum);
                return sum + (isNaN(aumValue) ? 0 : aumValue);
              }, 0).toFixed(1)}B
            </div>
            <p className="text-xs text-muted-foreground">관리자산 총액</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>해외펀드 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {funds.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">해외펀드가 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">새로운 해외펀드를 추가해보세요.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>펀드명</TableHead>
                  <TableHead>운용사</TableHead>
                  <TableHead>AUM</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>자사주 보유</TableHead>
                  <TableHead>보유비중</TableHead>
                  <TableHead className="w-24">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funds.map((fund) => (
                  <TableRow key={fund.id}>
                    <TableCell className="font-medium">{fund.name}</TableCell>
                    <TableCell>{getCompanyName(fund.companyId)}</TableCell>
                    <TableCell>{formatAum(fund.aum)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getTypeColor(fund.type)}>
                        {fund.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fund.ownOurShares ? "default" : "secondary"}>
                        {fund.ownOurShares ? "보유" : "미보유"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {fund.ownOurShares && fund.shareAmount ? fund.shareAmount : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(fund)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(fund)}
                          className="text-red-600 hover:text-red-700"
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>해외펀드 수정</DialogTitle>
          </DialogHeader>
          <OverseasFundForm 
            fund={editingFund} 
            onSuccess={handleEditFormSuccess} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}