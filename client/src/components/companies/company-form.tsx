import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCompanySchema, type InsertCompany, type Company } from "@shared/schema";

interface CompanyFormProps {
  company?: Company;
  onSuccess?: () => void;
  onCancel?: () => void;
  apiPath?: string;
}

export default function CompanyForm({ company, onSuccess, onCancel, apiPath = "/api/companies" }: CompanyFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<InsertCompany>({
    resolver: zodResolver(insertCompanySchema),
    defaultValues: {
      name: company?.name || "",
      address: company?.address || "",
      aum: company ? parseFloat(company.aum || "0").toString() : "0",
      type: company?.type || "",
      hqLocation: company?.hqLocation || "",
      area: company?.area || "",
      shareholderStatus: company?.shareholderStatus || "N/A",
      shareCount: company?.shareCount || "",
      fundManagerCount: company?.fundManagerCount || undefined,
      establishedDate: company?.establishedDate || "",
      phone: company?.phone || "",
      website: company?.website || "",
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      const response = await apiRequest(apiPath, { method: "POST", body: data });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiPath] });
      toast({
        title: "성공",
        description: "회사가 성공적으로 생성되었습니다",
      });
      form.reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "회사 생성에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      const response = await apiRequest(`${apiPath}/${company!.id}`, { method: "PUT", body: data });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiPath] });
      toast({
        title: "성공",
        description: "회사가 성공적으로 업데이트되었습니다",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "회사 업데이트에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCompany) => {
    if (company) {
      updateCompanyMutation.mutate(data);
    } else {
      createCompanyMutation.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 필수 필드 - 회사명과 주소 */}
        <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="text-sm font-semibold text-blue-800">필수 정보</h3>
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>회사명 *</FormLabel>
                <FormControl>
                  <Input placeholder="회사명을 입력하세요" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>주소 *</FormLabel>
                <FormControl>
                  <Input placeholder="회사 주소를 입력하세요" value={field.value || ""} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 추가 정보 */}
        <div className="space-y-4">
          {/* Two-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>회사 유형</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="회사 유형을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mutual">Mutual</SelectItem>
                        <SelectItem value="Hedge">Hedge</SelectItem>
                        <SelectItem value="기타">기타</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hqLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>본사 위치</FormLabel>
                    <FormControl>
                      <Input placeholder="본사 위치를 입력하세요" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="establishedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설립일자</FormLabel>
                    <FormControl>
                      <Input type="date" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>전화번호</FormLabel>
                    <FormControl>
                      <Input placeholder="전화번호를 입력하세요" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="aum"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AUM / 운용자산 (억원 단위)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="예: 45000 (4조5천억원)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fundManagerCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>펀드 매니저수</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="펀드 매니저 수를 입력하세요" 
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shareholderStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주주여부</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== "Yes") {
                          form.setValue("shareCount", "");
                        }
                      }} 
                      defaultValue={field.value || "N/A"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="주주 여부를 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="N/A">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>웹사이트</FormLabel>
                    <FormControl>
                      <Input placeholder="웹사이트 주소를 입력하세요" value={field.value || ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Conditional field for share count - spans full width */}
          {form.watch("shareholderStatus") === "Yes" && (
            <FormField
              control={form.control}
              name="shareCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>주식수</FormLabel>
                  <FormControl>
                    <Input placeholder="보유 주식 수를 입력하세요" value={field.value || ""} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createCompanyMutation.isPending || updateCompanyMutation.isPending}
          >
            {company ? (
              updateCompanyMutation.isPending ? "업데이트 중..." : "회사 업데이트"
            ) : (
              createCompanyMutation.isPending ? "생성 중..." : "회사 생성"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}