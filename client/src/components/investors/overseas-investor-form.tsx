import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertInvestorSchema, type InsertInvestor, type OverseasInvestor, type OverseasCompany, type Fund } from "@shared/schema";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface OverseasInvestorFormProps {
  investor?: OverseasInvestor;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function OverseasInvestorForm({ investor, onSuccess, onCancel }: OverseasInvestorFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);

  const { data: companies } = useQuery<OverseasCompany[]>({
    queryKey: ["/api/overseas-companies"],
  });

  const { data: funds } = useQuery<Fund[]>({
    queryKey: ["/api/funds"],
  });

  const sortedCompanies = companies?.sort((a, b) => a.name.localeCompare(b.name)) || [];
  const sortedFunds = funds?.sort((a, b) => a.name.localeCompare(b.name)) || [];

  const form = useForm<InsertInvestor>({
    resolver: zodResolver(insertInvestorSchema),
    defaultValues: {
      name: investor?.name ?? "",
      email: investor?.email ?? "",
      phone: investor?.phone ?? undefined,
      company: investor?.company ?? "",
      fund: investor?.fund ?? undefined,
      position: investor?.position ?? undefined,
      positionType: investor?.positionType ?? undefined,
      specialty: investor?.specialty ?? [],
      ownsOurShare: investor?.ownsOurShare ?? undefined,
      shareAmount: investor?.shareAmount ?? undefined,
      note: investor?.note ?? undefined,
      avatarInitials: investor?.avatarInitials ?? undefined,
      totalExperience: investor?.totalExperience ?? undefined,
      currentCompanyExperience: investor?.currentCompanyExperience ?? undefined,
      managedFundAum: investor?.managedFundAum ? parseFloat(investor.managedFundAum) : undefined,
      numberOfManagedFunds: investor?.numberOfManagedFunds ?? undefined,
      country: investor?.country ?? "Korea",
      language: investor?.language ?? "Korean",
      timezone: investor?.timezone ?? "Asia/Seoul",
    },
  });

  const createInvestorMutation = useMutation({
    mutationFn: async (data: InsertOverseasInvestor) => {
      const response = await apiRequest("POST", "/api/overseas-investors", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overseas-investors"] });
      toast({
        title: "성공",
        description: "해외투자가가 성공적으로 생성되었습니다",
      });
      form.reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "해외투자가 생성에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const updateInvestorMutation = useMutation({
    mutationFn: async (data: InsertOverseasInvestor) => {
      const response = await apiRequest("PUT", `/api/overseas-investors/${investor!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overseas-investors"] });
      toast({
        title: "성공",
        description: "해외투자가가 성공적으로 수정되었습니다",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "해외투자가 수정에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertOverseasInvestor) => {
    if (investor) {
      updateInvestorMutation.mutate(data);
    } else {
      createInvestorMutation.mutate(data);
    }
  };

  const generateAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleNameChange = (name: string) => {
    form.setValue('name', name);
    if (!investor) {
      const initials = generateAvatarInitials(name);
      form.setValue('avatarInitials', initials);
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
                  <FormLabel>이름</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="이름을 입력하세요" 
                      {...field}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
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
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="이메일을 입력하세요" {...field} />
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
                  <FormLabel>연락처</FormLabel>
                  <FormControl>
                    <Input placeholder="연락처를 입력하세요" {...field} />
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
                  <FormLabel>회사</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="회사를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedCompanies.map((company) => (
                          <SelectItem key={company.id} value={company.name}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fund"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>펀드</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="펀드를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">선택 안함</SelectItem>
                        {sortedFunds.map((fund) => (
                          <SelectItem key={fund.id} value={fund.name}>
                            {fund.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Input placeholder="직책을 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="positionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>직책 유형</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="직책 유형을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PM">PM</SelectItem>
                        <SelectItem value="Buyside Analyst">Buyside Analyst</SelectItem>
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
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>국가</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="국가를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Korea">Korea</SelectItem>
                        <SelectItem value="US">US</SelectItem>
                        <SelectItem value="UK">UK</SelectItem>
                        <SelectItem value="Japan">Japan</SelectItem>
                        <SelectItem value="Singapore">Singapore</SelectItem>
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
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>언어</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="언어를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Korean">Korean</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Japanese">Japanese</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                R&R 상세정보
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>총운용경력 (년)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="총 운용 경력 년수" 
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentCompanyExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현회사운용경력 (년)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="현재 회사 경력 년수" 
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="managedFundAum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>운용펀드AUM (백만달러)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1"
                          placeholder="운용 펀드 AUM" 
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numberOfManagedFunds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>운용펀드수</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="운용 펀드 개수" 
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ownsOurShare"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>당사 주식 보유 여부</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="보유 여부를 선택하세요" />
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

              {form.watch("ownsOurShare") === "Yes" && (
                <FormField
                  control={form.control}
                  name="shareAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>보유 수량</FormLabel>
                      <FormControl>
                        <Input placeholder="보유 주식 수량을 입력하세요" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메모</FormLabel>
                    <FormControl>
                      <Textarea placeholder="추가 메모를 입력하세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={createInvestorMutation.isPending || updateInvestorMutation.isPending}
            >
              {createInvestorMutation.isPending || updateInvestorMutation.isPending 
                ? "저장 중..." 
                : investor ? "수정" : "추가"
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}