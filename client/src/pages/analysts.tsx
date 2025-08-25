import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Eye, Edit, Trash2, Upload, ChevronUp, ChevronDown } from "lucide-react";
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

type SortField = 'name' | 'company' | 'specialization' | null;
type SortDirection = 'asc' | 'desc';

export default function Analysts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAnalyst, setSelectedAnalyst] = useState<Analyst | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

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
      
      let aValue = '';
      let bValue = '';
      
      // Get values based on sort field
      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'company':
          aValue = a.company;
          bValue = b.company;
          break;
        case 'specialization':
          aValue = translateSpecializationArray(a.specialization || []);
          bValue = translateSpecializationArray(b.specialization || []);
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }
      
      const aIsKorean = isKorean(aValue);
      const bIsKorean = isKorean(bValue);
      
      // Korean text first, then English text
      if (aIsKorean && !bIsKorean) return sortDirection === 'asc' ? -1 : 1;
      if (!aIsKorean && bIsKorean) return sortDirection === 'asc' ? 1 : -1;
      
      // Both Korean or both English - sort alphabetically
      const comparison = aValue.localeCompare(bValue, 'ko-KR');
      return sortDirection === 'asc' ? comparison : -comparison;
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

  // 담당분야 영어 -> 한국어 변환 함수
  const translateSpecialization = (spec: string): string => {
    const translations: Record<string, string> = {
      // 산업분야
      "Semiconductor": "반도체",
      "Technology": "기술",
      "Defense": "방산",
      "Industrial": "산업재",
      "Utilities": "유틸리티",
      "Machinery": "기계",
      "Healthcare": "헬스케어",
      "Pharmaceuticals": "제약",
      "Biotech": "바이오",
      "Energy": "에너지",
      "Oil": "석유",
      "Gas": "가스",
      "Renewable": "신재생에너지",
      "Financial": "금융",
      "Banking": "은행",
      "Insurance": "보험",
      "Real Estate": "부동산",
      "Construction": "건설",
      "Materials": "소재",
      "Steel": "철강",
      "Chemical": "화학",
      "Petrochemical": "석유화학",
      "Consumer": "소비재",
      "Food": "식품",
      "Beverage": "음료",
      "Retail": "유통",
      "Automotive": "자동차",
      "Shipping": "해운",
      "Airlines": "항공",
      "Transportation": "운송",
      "Logistics": "물류",
      "Telecom": "통신",
      "Media": "미디어",
      "Entertainment": "엔터테인먼트",
      "Gaming": "게임",
      "Internet": "인터넷",
      "Software": "소프트웨어",
      "Hardware": "하드웨어",
      "IT": "IT",
      "Electronics": "전자",
      "Display": "디스플레이",
      "Battery": "배터리",
      "Solar": "태양광",
      "Wind": "풍력",
      "Nuclear": "원자력",
      "Coal": "석탄",
      "Mining": "광업",
      "Agriculture": "농업",
      "Fisheries": "수산업",
      "Forestry": "임업",
      "Textiles": "섬유",
      "Apparel": "의류",
      "Cosmetics": "화장품",
      "Household": "생활용품",
      "Sports": "스포츠",
      "Tourism": "관광",
      "Hotels": "호텔",
      "Education": "교육",
      "Healthcare Services": "의료서비스",
      "Hospitals": "병원",
      "Medical Equipment": "의료기기",
      "REIT": "리츠",
      "Investment": "투자",
      "Asset Management": "자산운용",
      "Private Equity": "사모펀드",
      "Venture Capital": "벤처캐피털",
      "ESG": "ESG",
      "Green Finance": "그린파이낸스",
      "Digital Transformation": "디지털 전환",
      "AI": "인공지능",
      "IoT": "사물인터넷",
      "Cloud": "클라우드",
      "Cybersecurity": "사이버보안",
      "Fintech": "핀테크",
      "E-commerce": "전자상거래",
      "Platform": "플랫폼",
      "Subscription": "구독서비스",
      "SaaS": "SaaS",
      "Big Data": "빅데이터",
      "Blockchain": "블록체인",
      "Cryptocurrency": "암호화폐",
      "NFT": "NFT",
      "Metaverse": "메타버스",
      "VR": "가상현실",
      "AR": "증강현실",
      "5G": "5G",
      "6G": "6G",
      "Space": "우주",
      "Satellite": "위성"
    };
    
    return translations[spec] || spec;
  };

  // 담당분야 배열을 한국어로 변환 (중복 제거)
  const translateSpecializationArray = (specializations: string[]): string => {
    if (!Array.isArray(specializations) || specializations.length === 0) {
      return "N/A";
    }
    
    // 각 항목을 번역하고 중복 제거
    const translatedSpecs = specializations
      .map(spec => translateSpecialization(spec.trim()))
      .filter(spec => spec !== "" && spec !== "N/A");
    
    // 중복 제거 (Set 사용)
    const uniqueSpecs = Array.from(new Set(translatedSpecs));
    
    // 한국어가 먼저 오도록 정렬
    const sortedSpecs = uniqueSpecs.sort((a, b) => {
      const aIsKorean = /^[가-힣]/.test(a);
      const bIsKorean = /^[가-힣]/.test(b);
      
      // 한국어가 영어보다 먼저
      if (aIsKorean && !bIsKorean) return -1;
      if (!aIsKorean && bIsKorean) return 1;
      
      // 같은 언어끼리는 가나다/알파벳순
      return a.localeCompare(b, 'ko-KR');
    });
    
    return sortedSpecs.length > 0 ? sortedSpecs.join(", ") : "N/A";
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
                <TableHead 
                  className="w-[120px] cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('name')}
                >
                  이름{getSortIcon('name')}
                </TableHead>
                <TableHead 
                  className="w-[180px] cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('company')}
                >
                  회사{getSortIcon('company')}
                </TableHead>
                <TableHead 
                  className="w-[160px] cursor-pointer hover:bg-muted/50 select-none whitespace-nowrap"
                  onClick={() => handleSort('specialization')}
                >
                  담당분야{getSortIcon('specialization')}
                </TableHead>
                <TableHead className="w-[140px]">전화번호</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>커버리지여부</TableHead>
                <TableHead className="w-[120px]">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnalysts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    애널리스트를 찾을 수 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnalysts.map((analyst: Analyst) => (
                  <TableRow key={analyst.id}>
                    <TableCell className="font-medium w-[120px]">{analyst.name}</TableCell>
                    <TableCell className="w-[180px]">{analyst.company}</TableCell>
                    <TableCell>
                      {translateSpecializationArray(analyst.specialization || [])}
                    </TableCell>
                    <TableCell className="w-[140px]">{analyst.phone || "N/A"}</TableCell>
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
                    {translateSpecializationArray(selectedAnalyst?.specialization || [])}
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