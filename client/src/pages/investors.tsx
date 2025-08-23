import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvestorTable from "@/components/investors/investor-table";
import InvestorFormSimplified from "@/components/investors/investor-form-simplified";
import FundManagerTable from "@/components/fund-managers/fund-manager-table";
import { Plus, Search, Upload, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Investor, FundManager } from "@shared/schema";

export default function Investors() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: investors, isLoading } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: fundManagers, isLoading: isFundManagersLoading } = useQuery<FundManager[]>({
    queryKey: ["/api/fund-managers"],
  });

  const uploadFundManagersMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/fund-managers/upload-csv', {
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
        title: "펀드매니저 업로드 성공",
        description: `${data.imported}개의 펀드매니저 데이터가 성공적으로 업로드되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fund-managers"] });
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

  const filteredFundManagers = fundManagers?.filter(fm =>
    fm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fm.company.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFundManagersMutation.mutate(file);
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
            <h2 className="text-2xl font-bold text-gray-900">투자자 & 펀드매니저 관리</h2>
            <p className="text-gray-600 mt-1">투자자 및 펀드매니저 데이터 관리</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Buyside / 투자자 추가
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
          </div>
        </div>
      </div>

      <Tabs defaultValue="fund-managers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fund-managers">펀드매니저</TabsTrigger>
          <TabsTrigger value="investors">투자자 (Buyside)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fund-managers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>펀드매니저 목록</CardTitle>
                  <CardDescription>CSV 파일을 통해 펀드매니저 데이터를 업로드하고 관리하세요</CardDescription>
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv"
                    style={{ display: 'none' }}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadFundManagersMutation.isPending}
                    variant="outline"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadFundManagersMutation.isPending ? "업로드 중..." : "CSV 업로드"}
                  </Button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="펀드매니저 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <FundManagerTable 
                fundManagers={filteredFundManagers} 
                isLoading={isFundManagersLoading} 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="investors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Buyside / 전체 투자자</CardTitle>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
