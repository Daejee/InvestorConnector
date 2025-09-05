import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import InvestorTable from "@/components/investors/investor-table";
import InvestorFormSimplified from "@/components/investors/investor-form-simplified";
import { Plus, Search, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Investor } from "@shared/schema";
import { useOrganization } from "@/contexts/OrganizationContext";

export default function Investors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const { data: investors, isLoading } = useQuery<Investor[]>({
    queryKey: ["/api/investors", organizationId],
    enabled: !!organizationId,
  });

  const uploadInvestorsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/investors/upload-csv', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "투자자 업로드 성공",
        description: `${data.imported}개의 투자자 데이터가 성공적으로 업로드되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/investors", organizationId] });
    },
    onError: (error) => {
      toast({
        title: "업로드 실패",
        description: "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const filteredInvestors = investors?.filter(investor =>
    investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    investor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    investor.company.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadInvestorsMutation.mutate(file);
    }
    // Reset the input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Buyside / 투자자</h2>
            <p className="text-gray-600 mt-1">투자자 Profile 관리 (펀드매니저 포함)</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  투자자 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Buyside / 새 투자자 추가</DialogTitle>
                </DialogHeader>
                <InvestorFormSimplified 
                  onSuccess={() => setIsDialogOpen(false)}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              style={{ display: 'none' }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadInvestorsMutation.isPending}
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadInvestorsMutation.isPending ? "업로드 중..." : "CSV 업로드"}
            </Button>
          </div>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>전체 투자자</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search buyside... / 투자자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <InvestorTable 
            investors={filteredInvestors} 
            isLoading={isLoading} 
          />
        </CardContent>
      </Card>
    </div>
  );
}