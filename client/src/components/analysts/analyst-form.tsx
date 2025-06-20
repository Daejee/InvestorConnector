import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertAnalystSchema, type Analyst } from "@shared/schema";
import { z } from "zod";

const formSchema = insertAnalystSchema.extend({
  name: z.string().min(1, "Name is required / 이름은 필수입니다"),
  email: z.string().email("Invalid email / 올바른 이메일을 입력하세요"),
  company: z.string().min(1, "Company is required / 회사명은 필수입니다"),
});

type FormData = z.infer<typeof formSchema>;

interface AnalystFormProps {
  analyst?: Analyst | null;
  onClose: () => void;
}

export function AnalystForm({ analyst, onClose }: AnalystFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: analyst?.name ?? "",
      email: analyst?.email ?? "",
      phone: analyst?.phone ?? "",
      company: analyst?.company ?? "",
      position: analyst?.position ?? "",
      specialization: analyst?.specialization ?? "",
      coverage: analyst?.coverage ?? "",
      language: analyst?.language ?? "Korean",
      country: analyst?.country ?? "Korea",
      status: analyst?.status ?? "No",
      notes: analyst?.notes ?? "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/analysts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create analyst");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysts"] });
      toast({
        title: "Success / 성공",
        description: "Analyst created successfully / 애널리스트가 성공적으로 생성되었습니다",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error / 오류",
        description: "Failed to create analyst / 애널리스트 생성에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/api/analysts/${analyst!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update analyst");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysts"] });
      toast({
        title: "Success / 성공",
        description: "Analyst updated successfully / 애널리스트가 성공적으로 업데이트되었습니다",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error / 오류",
        description: "Failed to update analyst / 애널리스트 업데이트에 실패했습니다",
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
                <FormLabel>Name / 이름 *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter analyst name / 애널리스트 이름 입력" {...field} />
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
                <FormLabel>Email / 이메일 *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="analyst@company.com" {...field} />
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
                <FormLabel>Phone / 전화번호</FormLabel>
                <FormControl>
                  <Input placeholder="+82-10-1234-5678" {...field} />
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
                <FormLabel>Company / 회사 *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter company name / 회사명 입력" {...field} />
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
                <FormLabel>Position / 직책</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position / 직책 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="애널리스트">애널리스트 / Analyst</SelectItem>
                      <SelectItem value="RA">RA</SelectItem>
                      <SelectItem value="리서치해드">리서치해드 / Research Head</SelectItem>
                      <SelectItem value="기타">기타 / Other</SelectItem>
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
              <FormItem>
                <FormLabel>Specialization / 전문분야</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialization / 전문분야 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technology">Technology / 기술</SelectItem>
                      <SelectItem value="Healthcare">Healthcare / 헬스케어</SelectItem>
                      <SelectItem value="Finance">Finance / 금융</SelectItem>
                      <SelectItem value="Consumer">Consumer / 소비재</SelectItem>
                      <SelectItem value="Energy">Energy / 에너지</SelectItem>
                      <SelectItem value="Industrial">Industrial / 산업재</SelectItem>
                      <SelectItem value="Real Estate">Real Estate / 부동산</SelectItem>
                      <SelectItem value="Materials">Materials / 소재</SelectItem>
                      <SelectItem value="Telecommunications">Telecommunications / 통신</SelectItem>
                      <SelectItem value="Utilities">Utilities / 유틸리티</SelectItem>
                      <SelectItem value="Semiconductor">반도체</SelectItem>
                      <SelectItem value="Defense">방산</SelectItem>
                      <SelectItem value="Machinery">기계</SelectItem>
                      <SelectItem value="Shipbuilding">조선</SelectItem>
                      <SelectItem value="Other">Other / 기타</SelectItem>
                    </SelectContent>
                  </Select>
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
                <FormLabel>Coverage / 담당 영역</FormLabel>
                <FormControl>
                  <Input placeholder="Companies or sectors covered / 담당 회사나 섹터" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country / 국가</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country / 국가 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Korea">Korea / 한국</SelectItem>
                      <SelectItem value="US">United States / 미국</SelectItem>
                      <SelectItem value="UK">United Kingdom / 영국</SelectItem>
                      <SelectItem value="Japan">Japan / 일본</SelectItem>
                      <SelectItem value="Singapore">Singapore / 싱가포르</SelectItem>
                      <SelectItem value="Hong Kong">Hong Kong / 홍콩</SelectItem>
                      <SelectItem value="China">China / 중국</SelectItem>
                      <SelectItem value="Australia">Australia / 호주</SelectItem>
                      <SelectItem value="Canada">Canada / 캐나다</SelectItem>
                      <SelectItem value="Germany">Germany / 독일</SelectItem>
                      <SelectItem value="France">France / 프랑스</SelectItem>
                      <SelectItem value="Other">Other / 기타</SelectItem>
                    </SelectContent>
                  </Select>
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
                <FormLabel>Language / 언어</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language / 언어 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Korean">Korean / 한국어</SelectItem>
                      <SelectItem value="English">English / 영어</SelectItem>
                      <SelectItem value="Japanese">Japanese / 일본어</SelectItem>
                      <SelectItem value="Chinese">Chinese / 중국어</SelectItem>
                      <SelectItem value="Other">Other / 기타</SelectItem>
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
                <FormLabel>Coverage / 커버리지여부</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select coverage / 커버리지 선택" />
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
              <FormLabel>Notes / 메모</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes about the analyst / 애널리스트에 대한 추가 메모"
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
            Cancel / 취소
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving... / 저장 중..." : analyst ? "Update / 업데이트" : "Create / 생성"}
          </Button>
        </div>
      </form>
    </Form>
  );
}