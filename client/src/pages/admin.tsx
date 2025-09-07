import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings, 
  Download, 
  Database, 
  Users, 
  Building, 
  FileText, 
  Plus,
  Edit,
  Trash2,
  Crown,
  BarChart3,
  ExternalLink
} from "lucide-react";

interface Organization {
  id: number;
  name: string;
  domain: string;
  subscriptionTier: string;
  settings: any;
  createdAt: string;
  isActive: boolean;
}

interface DatabaseStats {
  investors: number;
  overseasInvestors: number;
  analysts: number;
  companies: number;
  overseasCompanies: number;
  securitiesFirms: number;
  funds: number;
  overseasFunds: number;
  meetings: number;
  documents: number;
  users: number;
  analystReports: number;
}

const organizationSchema = z.object({
  name: z.string().min(1, "조직명을 입력해주세요"),
  domain: z.string().min(1, "도메인을 입력해주세요"),
  subscriptionTier: z.enum(["starter", "professional", "enterprise"]),
});

type OrganizationForm = z.infer<typeof organizationSchema>;

export default function Admin() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  // 조직 삭제 mutation
  const deleteOrganizationMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await apiRequest(`/api/organizations/${organizationId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "조직이 성공적으로 삭제되었습니다.",
      });
      
      // 조직 목록 새로고침
      refetchOrganizations();
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "조직 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteOrganization = (orgId: number, orgName: string) => {
    if (orgId === 1) {
      toast({
        title: "삭제 불가",
        description: "기본 조직은 삭제할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      `정말로 "${orgName}" 조직을 삭제하시겠습니까?\n\n⚠️ 경고: 이 작업은 되돌릴 수 없으며, 해당 조직의 모든 데이터(투자자, 애널리스트, 미팅 등)가 영구적으로 삭제됩니다.`
    );
    
    if (confirmed) {
      deleteOrganizationMutation.mutate(orgId);
    }
  };
  const { organizationId } = useOrganization();

  console.log("🏢 Admin page organizationId:", organizationId);

  const { data: organizations = [], isLoading: orgsLoading, refetch: refetchOrganizations } = useQuery<Organization[]>({
    queryKey: ["/api/organizations", organizationId],
  });



  const createOrgMutation = useMutation({
    mutationFn: async (data: OrganizationForm) => {
      return await apiRequest("/api/organizations", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "조직이 성공적으로 생성되었습니다.",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "조직 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await fetch(`/api/admin/export/${organizationId}`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("Export failed");
      return response.blob();
    },
    onSuccess: (blob, organizationId) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `organization_${organizationId}_data.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "데이터가 성공적으로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "데이터 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportCompaniesCsvMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await fetch(`/api/admin/export-companies-csv/${organizationId}`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("CSV export failed");
      return { blob: await response.blob(), organizationId };
    },
    onSuccess: ({ blob, organizationId }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `companies_org_${organizationId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "자산운용사 목록이 CSV로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "CSV 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // CSV Export mutations for each data type
  const exportInvestorsCsvMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await fetch(`/api/admin/export-investors-csv/${organizationId}`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("CSV export failed");
      return { blob: await response.blob(), organizationId };
    },
    onSuccess: ({ blob, organizationId }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `investors_org_${organizationId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "국내 투자자 목록이 CSV로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "국내 투자자 CSV 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportAnalystsCsvMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await fetch(`/api/admin/export-analysts-csv/${organizationId}`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("CSV export failed");
      return { blob: await response.blob(), organizationId };
    },
    onSuccess: ({ blob, organizationId }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `analysts_org_${organizationId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "애널리스트 목록이 CSV로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "애널리스트 CSV 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportMeetingsCsvMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await fetch(`/api/admin/export-meetings-csv/${organizationId}`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("CSV export failed");
      return { blob: await response.blob(), organizationId };
    },
    onSuccess: ({ blob, organizationId }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `meetings_org_${organizationId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "미팅 목록이 CSV로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "미팅 CSV 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportUsersCsvMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/export-users-csv`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("CSV export failed");
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `users.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "사용자 목록이 CSV로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "사용자 CSV 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportOverseasInvestorsCsvMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/export-overseas-investors-csv`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("CSV export failed");
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `overseas_investors.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "해외 투자자 목록이 CSV로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "해외 투자자 CSV 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportFundsCsvMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await fetch(`/api/admin/export-funds-csv/${organizationId}`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("CSV export failed");
      return { blob: await response.blob(), organizationId };
    },
    onSuccess: ({ blob, organizationId }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `funds_org_${organizationId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "자산운용사(국내) 목록이 CSV로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "자산운용사(국내) CSV 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportOverseasFundsCsvMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await fetch(`/api/admin/export-overseas-companies-csv/${organizationId}`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("CSV export failed");
      return { blob: await response.blob(), organizationId };
    },
    onSuccess: ({ blob, organizationId }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `overseas_companies_org_${organizationId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "자산운용사(해외) 목록이 CSV로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "자산운용사(해외) CSV 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportSecuritiesFirmsCsvMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await fetch(`/api/admin/export-securities-firms-csv/${organizationId}`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("CSV export failed");
      return { blob: await response.blob(), organizationId };
    },
    onSuccess: ({ blob, organizationId }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `securities_firms_org_${organizationId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "증권사 목록이 CSV로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "증권사 CSV 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const exportAllDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/export-all", {
        method: "GET",
      });
      if (!response.ok) throw new Error("Export failed");
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `all_organizations_data.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "성공",
        description: "전체 데이터가 성공적으로 다운로드되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "전체 데이터 다운로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      domain: "",
      subscriptionTier: "starter",
    },
  });

  const handleExportData = async (organizationId: number) => {
    setIsDownloading(true);
    await exportDataMutation.mutateAsync(organizationId);
    setIsDownloading(false);
  };

  const handleExportAllData = async () => {
    setIsDownloading(true);
    await exportAllDataMutation.mutateAsync();
    setIsDownloading(false);
  };

  const handleExportCompaniesCsv = async (organizationId: number) => {
    setIsDownloading(true);
    await exportCompaniesCsvMutation.mutateAsync(organizationId);
    setIsDownloading(false);
  };

  const handleExportInvestorsCsv = async (organizationId: number) => {
    setIsDownloading(true);
    await exportInvestorsCsvMutation.mutateAsync(organizationId);
    setIsDownloading(false);
  };

  const handleExportAnalystsCsv = async (organizationId: number) => {
    setIsDownloading(true);
    await exportAnalystsCsvMutation.mutateAsync(organizationId);
    setIsDownloading(false);
  };

  const handleExportMeetingsCsv = async (organizationId: number) => {
    setIsDownloading(true);
    await exportMeetingsCsvMutation.mutateAsync(organizationId);
    setIsDownloading(false);
  };

  const handleExportUsersCsv = async () => {
    setIsDownloading(true);
    await exportUsersCsvMutation.mutateAsync();
    setIsDownloading(false);
  };

  const handleExportOverseasInvestorsCsv = async () => {
    setIsDownloading(true);
    await exportOverseasInvestorsCsvMutation.mutateAsync();
    setIsDownloading(false);
  };

  const handleExportFundsCsv = async (organizationId: number) => {
    setIsDownloading(true);
    await exportFundsCsvMutation.mutateAsync(organizationId);
    setIsDownloading(false);
  };

  const handleExportOverseasFundsCsv = async (organizationId: number) => {
    setIsDownloading(true);
    await exportOverseasFundsCsvMutation.mutateAsync(organizationId);
    setIsDownloading(false);
  };

  const handleExportSecuritiesFirmsCsv = async (organizationId: number) => {
    setIsDownloading(true);
    await exportSecuritiesFirmsCsvMutation.mutateAsync(organizationId);
    setIsDownloading(false);
  };

  const handleAccessOrganization = (domain: string) => {
    // 도메인이 '.com'으로 끝나면 제거
    const cleanDomain = domain.replace('.com', '');
    
    // 기본 조직으로 전환하는 경우 간단한 인증 설정
    if (cleanDomain === 'default') {
      // 기본 조직 인증 상태 생성
      const defaultAuthState = {
        isAuthenticated: true,
        user: {
          id: 1,
          email: "admin",
          name: "관리자",
          organizationId: 1
        },
        timestamp: Date.now()
      };
      
      localStorage.setItem('auth_1', JSON.stringify(defaultAuthState));
    }
    
    const url = `/org/${cleanDomain}`;
    console.log("🔗 Redirecting to:", url);
    window.location.href = url; // Same tab navigation to trigger organization change
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "enterprise": return "bg-purple-100 text-purple-800";
      case "professional": return "bg-blue-100 text-blue-800";
      case "starter": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-600" />
            관리자 대시보드
          </h1>
          <p className="text-gray-600 mt-1">시스템 관리 및 데이터 내보내기</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleExportAllData}
            disabled={isDownloading}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            전체 데이터 다운로드
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                조직 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 조직 생성</DialogTitle>
                <DialogDescription>
                  새로운 조직을 생성합니다.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(data => createOrgMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>조직명</FormLabel>
                        <FormControl>
                          <Input placeholder="삼성자산운용" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>도메인</FormLabel>
                        <FormControl>
                          <Input placeholder="samsung" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subscriptionTier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>구독 등급</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="starter">Starter</option>
                            <option value="professional">Professional</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      취소
                    </Button>
                    <Button type="submit" disabled={createOrgMutation.isPending}>
                      {createOrgMutation.isPending ? "생성 중..." : "생성"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            조직 관리
          </CardTitle>
          <CardDescription>
            등록된 모든 조직의 목록과 관리
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orgsLoading ? (
            <div className="text-center py-8">조직 목록 로딩 중...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>조직명</TableHead>
                  <TableHead>도메인</TableHead>
                  <TableHead>구독 등급</TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-mono">{org.id}</TableCell>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="font-mono text-blue-600">
                      /org/{org.domain}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTierBadgeColor(org.subscriptionTier)}>
                        {org.subscriptionTier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(org.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.isActive ? "default" : "secondary"}>
                        {org.isActive ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleAccessOrganization(org.domain)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          title="조직에 접속하기"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportData(org.id)}
                          disabled={isDownloading}
                          title="전체 데이터 JSON 다운로드"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportCompaniesCsv(org.id)}
                          disabled={isDownloading}
                          title="자산운용사 목록 CSV 다운로드"
                          className="bg-green-50 hover:bg-green-100 border-green-200"
                        >
                          <FileText className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {org.id !== 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteOrganization(org.id, org.name)}
                            disabled={deleteOrganizationMutation.isPending}
                            title="조직 삭제"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}