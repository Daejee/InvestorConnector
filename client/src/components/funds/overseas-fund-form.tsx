import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertOverseasFundSchema, type InsertOverseasFund, type OverseasFund, type OverseasCompany } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OverseasFundFormProps {
  fund?: OverseasFund | null;
  onSuccess: () => void;
}

export default function OverseasFundForm({ fund, onSuccess }: OverseasFundFormProps) {
  const { toast } = useToast();
  const [ownOurShares, setOwnOurShares] = useState(fund?.ownOurShares || false);

  const { data: companies = [] } = useQuery<OverseasCompany[]>({
    queryKey: ["/api/overseas-companies"],
  });

  const form = useForm<InsertOverseasFund>({
    resolver: zodResolver(insertOverseasFundSchema),
    defaultValues: {
      name: fund?.name || "",
      companyId: fund?.companyId || 0,
      aum: fund?.aum || "",
      type: fund?.type || "Other",
      ownOurShares: fund?.ownOurShares || false,
      shareAmount: fund?.shareAmount || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertOverseasFund) => {
      return await apiRequest("POST", "/api/overseas-funds", { body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overseas-funds"] });
      toast({
        title: "생성 완료",
        description: "해외펀드가 성공적으로 생성되었습니다",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "생성 실패",
        description: "해외펀드 생성에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertOverseasFund) => {
      if (!fund) throw new Error("No fund to update");
      return await apiRequest("PUT", `/api/overseas-funds/${fund.id}`, { body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overseas-funds"] });
      toast({
        title: "수정 완료",
        description: "해외펀드가 성공적으로 수정되었습니다",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "수정 실패",
        description: "해외펀드 수정에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertOverseasFund) => {
    // Don't send shareAmount if ownOurShares is false
    const submitData = {
      ...data,
      shareAmount: data.ownOurShares ? data.shareAmount : null
    };

    if (fund) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const fundTypes = ["Value", "Growth", "GARP", "Index", "Other"];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>펀드명</FormLabel>
              <FormControl>
                <Input {...field} placeholder="펀드명을 입력하세요" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>해외 운용사</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="운용사를 선택하세요" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="aum"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AUM (Billion USD)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="예: 5.2" />
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
              <FormLabel>펀드 유형</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="펀드 유형을 선택하세요" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fundTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ownOurShares"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  자사 주식 보유 여부
                </FormLabel>
                <div className="text-sm text-muted-foreground">
                  이 펀드가 자사 주식을 보유하고 있는지 설정합니다
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    setOwnOurShares(checked);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {ownOurShares && (
          <FormField
            control={form.control}
            name="shareAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>보유 비중</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="예: 2.5%" value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? "처리 중..." : fund ? "수정" : "생성"}
          </Button>
        </div>
      </form>
    </Form>
  );
}