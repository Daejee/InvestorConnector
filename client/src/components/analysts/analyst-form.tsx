import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertAnalystSchema, type Analyst, type SecuritiesFirm } from "@shared/schema";
import { z } from "zod";

const formSchema = insertAnalystSchema.extend({
  name: z.string().min(1, "이름은 필수입니다"),
  email: z.string().email("올바른 이메일을 입력하세요"),
  company: z.string().min(1, "회사명은 필수입니다"),
});

type FormData = z.infer<typeof formSchema>;

interface AnalystFormProps {
  analyst?: Analyst | null;
  onClose: () => void;
}

export function AnalystForm({ analyst, onClose }: AnalystFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCustomCompany, setIsCustomCompany] = useState(false);

  // Fetch securities firms for company dropdown
  const { data: securitiesFirms = [] } = useQuery<SecuritiesFirm[]>({
    queryKey: ["/api/securities-firms"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: analyst?.name ?? "",
      email: analyst?.email ?? "",
      phone: analyst?.phone ?? "",
      company: analyst?.company ?? "",
      position: analyst?.position ?? "",
      specialization: analyst?.specialization ?? [],
      coverage: analyst?.coverage ?? "",
      language: analyst?.language ?? "Korean",
      status: analyst?.status ?? "No",
      notes: analyst?.notes ?? "",
    },
  });

  // Check if the current company is in the securities firms list
  useEffect(() => {
    if (analyst?.company && securitiesFirms.length > 0) {
      const firmExists = securitiesFirms.some(firm => firm.name === analyst.company);
      setIsCustomCompany(!firmExists);
    }
  }, [analyst?.company, securitiesFirms]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/analysts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, country: "Korea" }),
      });
      if (!response.ok) throw new Error("Failed to create analyst");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysts"] });
      toast({
        title: "성공",
        description: "애널리스트가 성공적으로 생성되었습니다",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "애널리스트 생성에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/api/analysts/${analyst!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, country: "Korea" }),
      });
      if (!response.ok) throw new Error("Failed to update analyst");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysts"] });
      toast({
        title: "성공",
        description: "애널리스트가 성공적으로 업데이트되었습니다",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "애널리스트 업데이트에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (analyst) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름 *</FormLabel>
                <FormControl>
                  <Input placeholder="애널리스트 이름 입력" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일 *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="analyst@company.co.kr" {...field} />
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
                  <Input placeholder="010-1234-5678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>회사 *</FormLabel>
                <FormControl>
                  {!isCustomCompany ? (
                    <Select 
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setIsCustomCompany(true);
                          field.onChange("");
                        } else {
                          field.onChange(value);
                        }
                      }} 
                      value={field.value || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="증권사 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {securitiesFirms
                          .sort((a, b) => {
                            // Korean names first, then English names
                            const isKoreanA = /^[가-힣]/.test(a.name);
                            const isKoreanB = /^[가-힣]/.test(b.name);
                            
                            if (isKoreanA && !isKoreanB) return -1;
                            if (!isKoreanA && isKoreanB) return 1;
                            
                            return a.name.localeCompare(b.name, 'ko-KR');
                          })
                          .map((firm) => (
                            <SelectItem key={firm.id} value={firm.name}>
                              {firm.name}
                            </SelectItem>
                          ))}
                        <SelectItem value="custom">기타 (직접 입력)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <Input 
                        placeholder="회사명 입력" 
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCustomCompany(false);
                          field.onChange("");
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>직책</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="직책 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="애널리스트">애널리스트</SelectItem>
                      <SelectItem value="RA">RA</SelectItem>
                      <SelectItem value="리서치해드">리서치해드</SelectItem>
                      <SelectItem value="브로커">브로커</SelectItem>
                      <SelectItem value="세일즈">세일즈</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specialization"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>전문분야 (다중 선택 가능)</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-3 gap-3 p-4 border rounded-md">
                    {[
                      { value: "Semiconductor", label: "반도체" },
                      { value: "Technology", label: "기술" },
                      { value: "Healthcare", label: "헬스케어" },
                      { value: "Finance", label: "금융" },
                      { value: "Consumer", label: "소비재" },
                      { value: "Energy", label: "에너지" },
                      { value: "Industrial", label: "산업재" },
                      { value: "Real Estate", label: "부동산" },
                      { value: "Materials", label: "소재" },
                      { value: "Telecommunications", label: "통신" },
                      { value: "Utilities", label: "유틸리티" },
                      { value: "Defense", label: "방산" },
                      { value: "Machinery", label: "기계" },
                      { value: "Shipbuilding", label: "조선" },
                      { value: "Other", label: "기타" }
                    ].map((item) => (
                      <div key={item.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={item.value}
                          checked={field.value?.includes(item.value) || false}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...(field.value || []), item.value]);
                            } else {
                              field.onChange((field.value || []).filter((value: string) => value !== item.value));
                            }
                          }}
                        />
                        <Label
                          htmlFor={item.value}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="coverage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>담당 영역</FormLabel>
                <FormControl>
                  <Input placeholder="담당 회사나 섹터" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>언어</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="언어 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Korean">한국어</SelectItem>
                      <SelectItem value="English">영어</SelectItem>
                      <SelectItem value="Japanese">일본어</SelectItem>
                      <SelectItem value="Chinese">중국어</SelectItem>
                      <SelectItem value="Other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>커버리지여부</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="커버리지 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>메모</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="애널리스트에 대한 추가 메모"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            취소
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "저장 중..." : analyst ? "업데이트" : "생성"}
          </Button>
        </div>
      </form>
    </Form>
  );
}