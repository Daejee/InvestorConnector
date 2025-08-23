import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  // Helper function to check if text contains Korean characters
  const hasKorean = (text: string) => /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);

  // Custom sorting function: Korean names first (가나다 order), then English (ABC order)
  const sortCompaniesByName = (a: Company, b: Company) => {
    const aHasKorean = hasKorean(a.name);
    const bHasKorean = hasKorean(b.name);
    
    // If both are Korean, sort by Korean alphabetical order
    if (aHasKorean && bHasKorean) {
      return a.name.localeCompare(b.name, 'ko-KR');
    }
    
    // If both are English, sort by English alphabetical order
    if (!aHasKorean && !bHasKorean) {
      return a.name.localeCompare(b.name, 'en-US');
    }
    
    // Korean names come first, English names second
    if (aHasKorean && !bHasKorean) {
      return -1;
    }
    
    if (!aHasKorean && bHasKorean) {
      return 1;
    }
    
    return 0;
  };

  const filteredCompanies = companies?.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.hqLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.type.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort(sortCompaniesByName) || [];

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
      const response = await apiRequest(`/api/companies/${companyId}/archive`, { method: "PUT" });
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
      ['회사명', 'AUM', '펀드 매니저수', '설립일자', '주소', 'TEL', 'WEB주소'],
      ['미래에셋자산운용', '1006554', '83', '1997-07-18', '서울 종로구 종로33 (더 그랑서울 TOWER1) 13층', '1588-1888', 'https://www.miraeasset.co.kr'],
      ['삼성자산운용', '1226449', '57', '1998-09-15', '서울 서초구 서초대로74길 11 (삼성자산운용)', '02-3774-7600', 'https://www.samsungam.com'],
      ['KB자산운용', '442773', '62', '1998-04-28', '서울 영등포구 국제금융로 8길 26, KB자산운용타워', '02-2167-8200', 'https://www.kbam.co.kr'],
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
            <h2 className="text-2xl font-bold text-gray-900">자산운용사(국내)</h2>
            <p className="text-gray-600 mt-1">자산운용사 정보</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV / CSV 업로드
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>CSV로 회사 정보 업로드</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      다음 형식의 CSV 파일을 업로드하세요:
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-medium text-gray-900 mb-3">CSV 형식 요구사항:</p>
                      <div className="space-y-4">
                        <div>
                          <strong>필수 헤더 (첫 번째 행):</strong>
                          <p className="text-sm text-gray-600 mt-1 font-mono bg-white p-2 rounded border">
                            Company Name,HQ Location,AUM,Type,Area
                          </p>
                        </div>
                        <div>
                          <strong>데이터 행 예시:</strong>
                          <p className="text-sm text-gray-600 mt-1 font-mono bg-white p-2 rounded border">
                            교보악사자산운용,서울,502862,투신사,Korea
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <strong>참고사항:</strong>
                            <ul className="mt-2 space-y-1 text-sm text-gray-600">
                              <li>• AUM 값은 억원 단위로 입력</li>
                              <li>• 여러 단어로 된 유형은 따옴표 사용</li>
                              <li>• 헤더는 대소문자 구분 안함</li>
                            </ul>
                          </div>
                          <div>
                            <strong>지역 옵션:</strong>
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
                        CSV 파일을 선택하거나 드래그 앤 드롭하세요
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
                        {uploadCSVMutation.isPending ? "업로드 중..." : "CSV 파일 선택"}
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
            <CardTitle>All Companies / 전체 회사</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search companies... / 회사 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCompanies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No companies found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">회사명</TableHead>
                  <TableHead className="w-[120px] text-center">유형</TableHead>
                  <TableHead className="w-[100px] text-center">본사 위치</TableHead>
                  <TableHead className="w-[80px] text-center">지역</TableHead>
                  <TableHead className="w-[110px] text-right">AUM(억원)</TableHead>
                  <TableHead className="w-[100px] text-right">펀드 매니저수</TableHead>
                  <TableHead className="w-[100px] text-center">설립일자</TableHead>
                  <TableHead className="w-[250px]">주소</TableHead>
                  <TableHead className="w-[120px] text-center">전화번호</TableHead>
                  <TableHead className="w-[140px] text-center">웹사이트</TableHead>
                  <TableHead className="w-[100px] text-center">주주여부</TableHead>
                  <TableHead className="w-[80px] text-center">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium w-[180px]">{company.name}</TableCell>
                    <TableCell className="text-center w-[120px]">{company.type}</TableCell>
                    <TableCell className="text-center w-[100px]">{company.hqLocation}</TableCell>
                    <TableCell className="text-center w-[80px]">{company.area || 'Korea'}</TableCell>
                    <TableCell className="text-right font-mono w-[110px]">{parseFloat(company.aum).toLocaleString()}</TableCell>
                    <TableCell className="text-right w-[100px]">{company.fundManagerCount || '-'}</TableCell>
                    <TableCell className="text-center w-[100px]">{company.establishedDate || '-'}</TableCell>
                    <TableCell className="w-[250px] truncate" title={company.address || ''}>{company.address || '-'}</TableCell>
                    <TableCell className="text-center w-[120px] font-mono text-sm">{company.phone || '-'}</TableCell>
                    <TableCell className="w-[140px]">
                      {company.website ? (
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-sm truncate block">
                          {company.website.length > 20 ? `${company.website.substring(0, 20)}...` : company.website}
                        </a>
                      ) : <span className="text-center block">-</span>}
                    </TableCell>
                    <TableCell className="text-center w-[100px]">
                      {company.shareholderStatus === "Yes" && company.shareCount ? 
                        `Yes (${company.shareCount})` : 
                        company.shareholderStatus || "N/A"
                      }
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
