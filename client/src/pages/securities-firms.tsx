import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Building,
  Plus,
  Search,
  Upload,
  Eye,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Globe,
  MoreVertical
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SecuritiesFirm, InsertSecuritiesFirm } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function SecuritiesFirms() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFirm, setSelectedFirm] = useState<SecuritiesFirm | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: firms = [], isLoading } = useQuery<SecuritiesFirm[]>({
    queryKey: ["/api/securities-firms"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSecuritiesFirm) => {
      const response = await fetch("/api/securities-firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/securities-firms"] });
      setShowCreateDialog(false);
      toast({ title: "Securities firm created successfully / 증권사가 성공적으로 생성되었습니다" });
    },
    onError: () => {
      toast({ 
        title: "Failed to create securities firm / 증권사 생성에 실패했습니다", 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertSecuritiesFirm> }) => {
      const response = await fetch(`/api/securities-firms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/securities-firms"] });
      setShowEditDialog(false);
      toast({ title: "Securities firm updated successfully / 증권사가 성공적으로 업데이트되었습니다" });
    },
    onError: () => {
      toast({ 
        title: "Failed to update securities firm / 증권사 업데이트에 실패했습니다", 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/securities-firms/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/securities-firms"] });
      toast({ title: "Securities firm deleted successfully / 증권사가 성공적으로 삭제되었습니다" });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete securities firm / 증권사 삭제에 실패했습니다", 
        variant: "destructive" 
      });
    },
  });

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      
      const response = await fetch('/api/securities-firms/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/securities-firms"] });
      setShowUploadDialog(false);
      setCsvFile(null);
      
      if (result.created > 0) {
        toast({ 
          title: `Successfully imported ${result.created} securities firms / ${result.created}개의 증권사를 성공적으로 가져왔습니다` 
        });
      }
      
      if (result.skipped > 0 && result.errors) {
        toast({ 
          title: `${result.skipped} rows skipped / ${result.skipped}개 행 건너뜀`,
          description: result.errors.slice(0, 3).join(', '),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({ 
        title: "Failed to upload CSV / CSV 업로드에 실패했습니다", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredFirms = firms
    .filter(firm =>
      firm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      firm.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      firm.phone.includes(searchTerm)
    )
    .sort((a, b) => {
      // Helper function to check if a string starts with Korean characters
      const isKorean = (str: string) => /^[가-힣]/.test(str);
      
      const aIsKorean = isKorean(a.name);
      const bIsKorean = isKorean(b.name);
      
      // Korean names first, then English names
      if (aIsKorean && !bIsKorean) return -1;
      if (!aIsKorean && bIsKorean) return 1;
      
      // Both Korean or both English - sort alphabetically
      return a.name.localeCompare(b.name, 'ko-KR');
    });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">증권사/ Brokerage Firms</h2>
          <p className="text-gray-600 mt-1">증권사 및 중개업체 관리</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                CSV Upload / CSV 업로드
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Securities Firms CSV / 증권사 CSV 업로드</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">CSV File / CSV 파일</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Required columns / 필수 컬럼:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>이름 or 증권사 (필수)</li>
                    <li>주소 (필수)</li>
                    <li>대표번호 or 대표전화 (필수)</li>
                    <li>웹사이트 (선택사항)</li>
                  </ul>
                  <p className="mt-3 text-xs text-gray-500">
                    Supported formats / 지원 형식: 이름,주소,대표번호,웹사이트 OR 증권사,주소,대표전화,웹사이트
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                    Cancel / 취소
                  </Button>
                  <Button 
                    onClick={handleCsvUpload} 
                    disabled={!csvFile || isUploading}
                  >
                    {isUploading ? "Uploading... / 업로드 중..." : "Upload / 업로드"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Securities Firm / 증권사 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Securities Firm / 새 증권사 추가</DialogTitle>
              </DialogHeader>
              <SecuritiesFirmForm
                onSubmit={(data) => createMutation.mutate(data)}
                onCancel={() => setShowCreateDialog(false)}
                isSubmitting={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search by name, address, or phone / 이름, 주소, 전화번호로 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Securities Firms Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Securities Firms List / 증권사 목록</span>
            <Badge variant="outline" className="ml-auto">
              {filteredFirms.length} firms / 개 증권사
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading securities firms... / 증권사를 불러오는 중...</div>
          ) : filteredFirms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No securities firms found / 증권사를 찾을 수 없습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>주소</TableHead>
                  <TableHead>전화번호</TableHead>
                  <TableHead>웹사이트</TableHead>

                  <TableHead className="w-32">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFirms.map((firm) => (
                  <TableRow key={firm.id}>
                    <TableCell className="font-medium">{firm.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="truncate max-w-xs">{firm.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{firm.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {firm.website ? (
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <a 
                            href={firm.website.startsWith('http') ? firm.website : `https://${firm.website}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate max-w-xs"
                          >
                            {firm.website}
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedFirm(firm);
                              setShowViewDialog(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            상세보기
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedFirm(firm);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(firm.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            삭제
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

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Securities Firm Details / 증권사 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedFirm && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">이름</Label>
                  <p className="text-lg font-semibold">{selectedFirm.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status / 상태</Label>
                  <Badge variant={selectedFirm.status === 'active' ? 'default' : 'secondary'}>
                    {selectedFirm.status === 'active' ? 'Active / 활성' : 'Archived / 보관됨'}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">주소</Label>
                <p className="text-sm">{selectedFirm.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">전화번호</Label>
                  <p className="text-sm">{selectedFirm.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">웹사이트</Label>
                  {selectedFirm.website ? (
                    <a 
                      href={selectedFirm.website.startsWith('http') ? selectedFirm.website : `https://${selectedFirm.website}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {selectedFirm.website}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400">Not provided / 제공되지 않음</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Securities Firm / 증권사 편집</DialogTitle>
          </DialogHeader>
          {selectedFirm && (
            <SecuritiesFirmForm
              firm={selectedFirm}
              onSubmit={(data) => updateMutation.mutate({ id: selectedFirm.id, data })}
              onCancel={() => setShowEditDialog(false)}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SecuritiesFirmFormProps {
  firm?: SecuritiesFirm;
  onSubmit: (data: InsertSecuritiesFirm) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function SecuritiesFirmForm({ firm, onSubmit, onCancel, isSubmitting }: SecuritiesFirmFormProps) {
  const [formData, setFormData] = useState<InsertSecuritiesFirm>({
    name: firm?.name || "",
    address: firm?.address || "",
    phone: firm?.phone || "",
    website: firm?.website || "",
    status: firm?.status || "active",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">이름 *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="Enter securities firm name / 증권사 이름을 입력하세요"
        />
      </div>
      
      <div>
        <Label htmlFor="address">주소 *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          required
          placeholder="Enter full address / 전체 주소를 입력하세요"
        />
      </div>
      
      <div>
        <Label htmlFor="phone">전화번호 *</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          placeholder="Enter phone number / 전화번호를 입력하세요"
        />
      </div>
      
      <div>
        <Label htmlFor="website">웹사이트</Label>
        <Input
          id="website"
          value={formData.website || ""}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="Enter website URL / 웹사이트 URL을 입력하세요"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel / 취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving... / 저장 중..." : firm ? "Update / 업데이트" : "Create / 생성"}
        </Button>
      </div>
    </form>
  );
}