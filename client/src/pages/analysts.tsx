import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";
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
        title: "Success / 성공",
        description: "Analyst deleted successfully / 애널리스트가 성공적으로 삭제되었습니다",
      });
    },
    onError: () => {
      toast({
        title: "Error / 오류",
        description: "Failed to delete analyst / 애널리스트 삭제에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const filteredAnalysts = analysts.filter((analyst: Analyst) =>
    analyst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    analyst.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    analyst.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (analyst.specialization && analyst.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEdit = (analyst: Analyst) => {
    setSelectedAnalyst(analyst);
    setIsFormOpen(true);
  };

  const handleView = (analyst: Analyst) => {
    setSelectedAnalyst(analyst);
    setIsViewOpen(true);
  };

  const handleDelete = (analyst: Analyst) => {
    if (window.confirm(`Are you sure you want to delete ${analyst.name}? / ${analyst.name}을(를) 삭제하시겠습니까?`)) {
      deleteAnalystMutation.mutate(analyst.id);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedAnalyst(null);
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
        <div className="text-lg">Loading analysts... / 애널리스트 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analysts / 애널리스트</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedAnalyst(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Analyst / 애널리스트 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedAnalyst ? "Edit Analyst / 애널리스트 수정" : "Add New Analyst / 새 애널리스트 추가"}
              </DialogTitle>
            </DialogHeader>
            <AnalystForm analyst={selectedAnalyst} onClose={handleFormClose} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Analysts / 애널리스트 검색</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, company, or specialization... / 이름, 이메일, 회사, 전문분야로 검색..."
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
                <TableHead>Name / 이름</TableHead>
                <TableHead>Company / 회사</TableHead>
                <TableHead>Position / 직책</TableHead>
                <TableHead>Specialization / 전문분야</TableHead>
                <TableHead>Country / 국가</TableHead>
                <TableHead>Coverage / 커버리지여부</TableHead>
                <TableHead className="w-[120px]">Actions / 작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnalysts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No analysts found / 애널리스트를 찾을 수 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnalysts.map((analyst: Analyst) => (
                  <TableRow key={analyst.id}>
                    <TableCell className="font-medium">{analyst.name}</TableCell>
                    <TableCell>{analyst.company}</TableCell>
                    <TableCell>{analyst.position || "N/A"}</TableCell>
                    <TableCell>{analyst.specialization || "N/A"}</TableCell>
                    <TableCell>{analyst.country}</TableCell>
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
            <DialogTitle>Analyst Details / 애널리스트 상세정보</DialogTitle>
          </DialogHeader>
          {selectedAnalyst && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name / 이름</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email / 이메일</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone / 전화번호</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.phone || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Company / 회사</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.company}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Position / 직책</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.position || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Specialization / 전문분야</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.specialization || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Coverage / 담당 영역</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.coverage || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Country / 국가</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.country}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Language / 언어</label>
                  <p className="text-sm text-muted-foreground">{selectedAnalyst.language}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Coverage / 커버리지여부</label>
                  <div>{getCoverageBadge(selectedAnalyst.status || "No")}</div>
                </div>
              </div>
              {selectedAnalyst.notes && (
                <div>
                  <label className="text-sm font-medium">Notes / 메모</label>
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