import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertOverseasCompanySchema, type InsertOverseasCompany, type OverseasCompany } from "@shared/schema";

interface OverseasCompanyFormProps {
  company?: OverseasCompany;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function OverseasCompanyForm({ company, onSuccess, onCancel }: OverseasCompanyFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<InsertOverseasCompany>({
    resolver: zodResolver(insertOverseasCompanySchema),
    defaultValues: {
      name: company?.name || "",
      hqLocation: company?.hqLocation || "",
      aum: company ? parseFloat(company.aum).toString() : "",
      type: company?.type || "",
      area: company?.area || "",
      shareholderStatus: company?.shareholderStatus || "N/A",
      shareCount: company?.shareCount || "",
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: InsertOverseasCompany) => {
      const response = await apiRequest("POST", "/api/overseas-companies", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overseas-companies"] });
      toast({
        title: "성공",
        description: "해외자산운용사가 성공적으로 생성되었습니다",
      });
      form.reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "해외자산운용사 생성에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: InsertOverseasCompany) => {
      const response = await apiRequest("PUT", `/api/overseas-companies/${company!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overseas-companies"] });
      toast({
        title: "성공",
        description: "해외자산운용사가 성공적으로 수정되었습니다",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "해외자산운용사 수정에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertOverseasCompany) => {
    if (company) {
      updateCompanyMutation.mutate(data);
    } else {
      createCompanyMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>회사명</FormLabel>
                  <FormControl>
                    <Input placeholder="회사명을 입력하세요" {...field} />
                  </FormControl>
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
                    <Input placeholder="본사 위치를 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AUM (십억 달러)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1" 
                      placeholder="AUM을 입력하세요" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>유형</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="유형을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VC">VC</SelectItem>
                        <SelectItem value="PE">PE</SelectItem>
                        <SelectItem value="Hedge Fund">Hedge Fund</SelectItem>
                        <SelectItem value="Asset Management">Asset Management</SelectItem>
                        <SelectItem value="Insurance">Insurance</SelectItem>
                        <SelectItem value="Pension Fund">Pension Fund</SelectItem>
                        <SelectItem value="Sovereign Wealth Fund">Sovereign Wealth Fund</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>지역</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="지역을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">US</SelectItem>
                        <SelectItem value="EU">EU</SelectItem>
                        <SelectItem value="Hong Kong">Hong Kong</SelectItem>
                        <SelectItem value="Singapore">Singapore</SelectItem>
                        <SelectItem value="Korea">Korea</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <FormLabel>주주 여부</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="주주 여부를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                        <SelectItem value="N/A">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {form.watch("shareholderStatus") === "Yes" && (
            <FormField
              control={form.control}
              name="shareCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>보유 주식 수</FormLabel>
                  <FormControl>
                    <Input placeholder="보유 주식 수를 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={createCompanyMutation.isPending || updateCompanyMutation.isPending}
            >
              {createCompanyMutation.isPending || updateCompanyMutation.isPending 
                ? "저장 중..." 
                : company ? "수정" : "추가"
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}