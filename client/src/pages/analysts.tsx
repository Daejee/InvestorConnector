import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Eye, Edit, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AnalystForm } from "@/components/analysts/analyst-form";
import type { Analyst } from "@shared/schema";

export default function Analysts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAnalyst, setSelectedAnalyst] = useState<Analyst | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: analysts = [], isLoading } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  const deleteAnalystMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/analysts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete analyst");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysts"] });
      toast({
        title: "성공",
        description: "애널리스트가 성공적으로 삭제되었습니다",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "애널리스트 삭제에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/analysts/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysts"] });
      toast({
        title: "업로드 성공",
        description: result.message,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({
        title: "업로드 오류",
        description: error.message || "CSV 업로드에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const filteredAnalysts = analysts
    .filter((analyst: Analyst) =>
      analyst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analyst.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analyst.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(analyst.specialization) && analyst.specialization.some(spec => 
        spec.toLowerCase().includes(searchTerm.toLowerCase())
      ))
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

  const handleEdit = (analyst: Analyst) => {
    setSelectedAnalyst(analyst);
    setIsFormOpen(true);
  };

  const handleView = (analyst: Analyst) => {
    setSelectedAnalyst(analyst);
    setIsViewOpen(true);
  };

  const handleDelete = (analyst: Analyst) => {
    if (window.confirm(`${analyst.name}을(를) 삭제하시겠습니까?`)) {
      deleteAnalystMutation.mutate(analyst.id);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedAnalyst(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      uploadMutation.mutate(file);
    } else {
      toast({
        title: "잘못된 파일",
        description: "CSV 파일을 선택해주세요",
        variant: "destructive",
      });
    }
  };

  const getCoverageBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Yes: "default",
      No: "secondary",
    };
    
    const labels: Record<string, string> = {
      Yes: "Yes",
      No: "No",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">애널리스트 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">애널리스트/Broker 리스트</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploadMutation.isPending ? "업로드 중..." : "CSV 업로드"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedAnalyst(null)}>
                <Plus className="mr-2 h-4 w-4" />
                애널리스트 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedAnalyst ? "애널리스트 수정" : "애널리스트 추가"}
                </DialogTitle>
              </DialogHeader>
              <AnalystForm
                analyst={selectedAnalyst}
                onClose={handleFormClose}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>애널리스트 검색</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이름, 이메일, 회사, 전문분야로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">이름</TableHead>
                <TableHead>회사</TableHead>
                <TableHead>직책</TableHead>
                <TableHead>담당분야</TableHead>
                <TableHead>전화번호</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>커버리지여부</TableHead>
                <TableHead className="w-[120px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnalysts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    애널리스트를 찾을 수 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnalysts.map((analyst: Analyst) => (
                  <TableRow key={analyst.id}>
                    <TableCell className="font-medium w-[150px]">{analyst.name}</TableCell>
                    <TableCell>{analyst.company}</TableCell>
                    <TableCell>{analyst.position || "N/A"}</TableCell>
                    <TableCell>
                      {Array.isArray(analyst.specialization) && analyst.specialization.length > 0 
                        ? analyst.specialization.join(", ") 
                        : "N/A"}
                    </TableCell>
                    <TableCell>{analyst.phone || "N/A"}</TableCell>
                    <TableCell>{analyst.email || "N/A"}</TableCell>
                    <TableCell>{getCoverageBadge(analyst.status || "No")}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(analyst)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(analyst)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(analyst)}
                          disabled={deleteAnalystMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Analyst Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>애널리스트 상세정보</DialogTitle>
          </DialogHeader>
          {selectedAnalyst && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">이름</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">이메일</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">전화번호</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.phone || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">회사</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst?.company}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">직책</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst?.position || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">담당분야</label>
                  <p className="text-sm text-muted-foreground">
                    {Array.isArray(selectedAnalyst?.specialization) && selectedAnalyst.specialization.length > 0 
                      ? selectedAnalyst.specialization.join(", ") 
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">담당 영역</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst?.coverage || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">이메일</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst?.email || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">언어</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst?.language}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">커버리지여부</label>
                  <div>{getCoverageBadge(selectedAnalyst?.status || "No")}</div>
                </div>
              </div>
              {selectedAnalyst.notes && (
                <div>
                  <label className="text-sm font-medium">메모</label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAnalyst.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}