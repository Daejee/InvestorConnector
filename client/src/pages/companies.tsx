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
import { Plus, Search, Upload, Download, FileText, Edit, Archive, Trash2, MoreVertical, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Company } from "@shared/schema";

type SortField = 'name' | 'hqLocation' | 'area' | 'aum' | 'fundManagerCount' | 'establishedDate' | 'shareholderStatus';
type SortDirection = 'asc' | 'desc';

export default function Companies() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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

  // Handle header click to change sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon for header
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-blue-600" /> : 
      <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // Sort companies based on current sort field and direction
  const sortCompanies = (companies: Company[]) => {
    return [...companies].sort((a, b) => {
      let result = 0;
      
      switch (sortField) {
        case 'name':
          result = sortCompaniesByName(a, b);
          break;
        case 'hqLocation':
          result = a.hqLocation.localeCompare(b.hqLocation, 'ko-KR');
          break;
        case 'area':
          result = (a.area || 'Korea').localeCompare(b.area || 'Korea', 'ko-KR');
          break;
        case 'aum':
          result = parseFloat(a.aum) - parseFloat(b.aum);
          break;
        case 'fundManagerCount':
          result = (a.fundManagerCount || 0) - (b.fundManagerCount || 0);
          break;
        case 'establishedDate':
          result = (a.establishedDate || '').localeCompare(b.establishedDate || '');
          break;
        case 'shareholderStatus':
          result = (a.shareholderStatus || 'N/A').localeCompare(b.shareholderStatus || 'N/A');
          break;
        default:
          result = 0;
      }
      
      return sortDirection === 'desc' ? -result : result;
    });
  };

  const filteredCompanies = companies ? sortCompanies(
    companies.filter(company =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.hqLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) : [];

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
      const response = await apiRequest("DELETE", `/api/companies/${companyId}`, {});
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
      const response = await apiRequest("PUT", `/api/companies/${companyId}/archive`, {});
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
                          <strong>새로운 선택적 헤더 (가능하면 포함):</strong>
                          <p className="text-sm text-gray-600 mt-1 font-mono bg-white p-2 rounded border">
                            Manager Count,Established Date,Address,Phone,Website
                          </p>
                        </div>
                        <div>
                          <strong>완전한 헤더:</strong>
                          <p className="text-sm text-gray-600 mt-1 font-mono bg-white p-2 rounded border">
                            Company Name,HQ Location,AUM,Type,Area,Manager Count,Established Date,Address,Phone,Website
                          </p>
                        </div>
                        <div>
                          <strong>데이터 형식 주의사항:</strong>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>AUM: 숫자만 (단위: 억원)</li>
                            <li>펀드 매니저수: 숫자만</li>
                            <li>설립일자: YYYY-MM-DD 형식 (예: 2024-01-15)</li>
                            <li>주소: 텍스트 형식, 쉼표 포함 시 따옴표로 감싸기</li>
                            <li>전화번호: 하이픈 포함 형식 (예: 02-1234-5678)</li>
                            <li>웹사이트: https:// 로 시작하는 전체 URL</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex space-x-4">
                      <Button
                        onClick={downloadSampleCSV}
                        variant="outline"
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        샘플 CSV 다운로드
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-6">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".csv"
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <FileText className="h-8 w-8 text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600 mb-4">CSV 파일을 선택하세요</p>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadCSVMutation.isPending}
                      >
                        {uploadCSVMutation.isPending ? "업로드 중..." : "파일 선택"}
                      </Button>
                    </div>
                  </div>

                  {uploadResult && (
                    <Alert className={uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className={uploadResult.success ? "text-green-800" : "text-red-800"}>
                            {uploadResult.message}
                          </p>
                          {uploadResult.processed && (
                            <p className="text-sm text-gray-600">
                              처리된 항목: {uploadResult.processed}개 (새로 추가: {uploadResult.newCompanies}개, 업데이트: {uploadResult.updatedCompanies}개)
                            </p>
                          )}
                          {uploadResult.errors && uploadResult.errors.length > 0 && (
                            <div className="text-sm">
                              <p className="font-medium text-red-800">오류:</p>
                              <ul className="list-disc list-inside text-red-700">
                                {uploadResult.errors.slice(0, 5).map((error: string, index: number) => (
                                  <li key={index}>{error}</li>
                                ))}
                                {uploadResult.errors.length > 5 && (
                                  <li>... 및 {uploadResult.errors.length - 5}개 더</li>
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
                  회사추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>새 회사 추가</DialogTitle>
                </DialogHeader>
                <CompanyForm
                  onSuccess={() => {
                    setIsDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="회사명, 위치 또는 유형으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>자산운용사 목록 ({filteredCompanies.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 w-[150px]"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>회사명</span>
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 w-[180px] text-center"
                    onClick={() => handleSort('hqLocation')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>본사 위치</span>
                      {getSortIcon('hqLocation')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 w-[120px] text-right"
                    onClick={() => handleSort('aum')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>AUM(억원)</span>
                      {getSortIcon('aum')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 w-[140px] text-center"
                    onClick={() => handleSort('fundManagerCount')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>펀드 매니저수</span>
                      {getSortIcon('fundManagerCount')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 text-center"
                    onClick={() => handleSort('establishedDate')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>설립일자</span>
                      {getSortIcon('establishedDate')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[200px] text-center">주소</TableHead>
                  <TableHead className="text-center">연락처</TableHead>
                  <TableHead className="text-center">웹사이트</TableHead>
                  <TableHead className="w-[80px] text-center">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      {searchQuery ? "검색 결과가 없습니다." : "등록된 회사가 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="text-center w-[180px] py-3 px-2 whitespace-normal break-words">{company.hqLocation}</TableCell>
                      <TableCell className="text-right">
                        {parseFloat(company.aum).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center w-[140px] py-3 px-2 whitespace-normal">{company.fundManagerCount ? `${company.fundManagerCount}명` : '-'}</TableCell>
                      <TableCell className="text-center">{company.establishedDate || '-'}</TableCell>
                      <TableCell className="text-center w-[200px] py-3 px-2 whitespace-normal break-words text-sm">
                        {company.address ? (
                          <div title={company.address}>
                            {company.address.length > 30 ? `${company.address.substring(0, 30)}...` : company.address}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center text-sm">{company.phone || '-'}</TableCell>
                      <TableCell className="text-center text-sm">
                        {company.website ? (
                          <a 
                            href={company.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title={company.website}
                          >
                            링크
                          </a>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
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
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => archiveCompanyMutation.mutate(company.id)}
                              disabled={archiveCompanyMutation.isPending}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              보관
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteCompanyMutation.mutate(company.id)}
                              disabled={deleteCompanyMutation.isPending}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>회사 정보 수정</DialogTitle>
          </DialogHeader>
          {editingCompany && (
            <CompanyForm
              company={editingCompany}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setEditingCompany(null);
                queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}