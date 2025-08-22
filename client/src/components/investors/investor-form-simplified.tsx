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
import { insertInvestorSchema, type InsertInvestor, type Investor, type Company, type Fund } from "@shared/schema";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface InvestorFormProps {
  investor?: Investor;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InvestorFormSimplified({ investor, onSuccess, onCancel }: InvestorFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
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
      phone: investor?.phone ?? "",
      company: investor?.company ?? "",
      fund: investor?.fund ?? "",
      position: investor?.position ?? "",
      positionType: investor?.positionType ?? "",
      specialty: investor?.specialty ?? [],
      ownsOurShare: investor?.ownsOurShare ?? "",
      shareAmount: investor?.shareAmount ?? "",
      note: investor?.note ?? "",
      avatarInitials: investor?.avatarInitials ?? "",
      totalExperience: investor?.totalExperience ?? undefined,
      currentCompanyExperience: investor?.currentCompanyExperience ?? undefined,
      managedFundAum: investor?.managedFundAum ?? undefined,
      numberOfManagedFunds: investor?.numberOfManagedFunds ?? undefined,
    },
  });

  const createInvestorMutation = useMutation({
    mutationFn: async (data: InsertInvestor) => {
      const response = await apiRequest("POST", "/api/investors", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      toast({
        title: "Success",
        description: "Investor has been created successfully.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create investor.",
        variant: "destructive",
      });
    },
  });

  const updateInvestorMutation = useMutation({
    mutationFn: async (data: InsertInvestor) => {
      const response = await apiRequest("PATCH", `/api/investors/${investor!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investors"] });
      toast({
        title: "Success",
        description: "Investor has been updated successfully.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update investor.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertInvestor) => {
    // Generate initials if not provided
    if (!data.avatarInitials) {
      data.avatarInitials = data.name
        .split(" ")
        .map(word => word.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    
    if (investor) {
      updateInvestorMutation.mutate(data);
    } else {
      createInvestorMutation.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Essential Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">기본 정보</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이름 *</FormLabel>
                  <FormControl>
                    <Input placeholder="투자자 이름을 입력하세요" {...field} />
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
                    <Input type="email" placeholder="이메일 주소를 입력하세요" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sortedCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.name}>
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
            name="fund"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fund</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a fund (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sortedFunds.map((fund) => (
                      <SelectItem key={fund.id} value={fund.name}>
                        {fund.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Additional Details - Collapsible */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button 
              type="button"
              variant="outline" 
              className="w-full flex items-center justify-between"
            >
              <span>R&R정보</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position(대리, 과장 등 직책)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter position/title" {...field} value={field.value ?? ""} />
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
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="positionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>R&R(PM, 애널리스트 등)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PM">PM</SelectItem>
                      <SelectItem value="Buyside Analyst">Buyside Analyst</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("positionType") === "Buyside Analyst" && (
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Specialty / 담당분야 (다중 선택 가능)</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-3 gap-3 p-4 border rounded-md">
                        {[
                          // Industry specializations
                          { value: "Semiconductor", label: "Semiconductor / 반도체" },
                          { value: "Technology", label: "Technology / 기술" },
                          { value: "Healthcare", label: "Healthcare / 헬스케어" },
                          { value: "Finance", label: "Finance / 금융" },
                          { value: "Consumer", label: "Consumer / 소비재" },
                          { value: "Energy", label: "Energy / 에너지" },
                          { value: "Industrial", label: "Industrial / 산업재" },
                          { value: "Real Estate", label: "Real Estate / 부동산" },
                          { value: "Materials", label: "Materials / 소재" },
                          { value: "Telecommunications", label: "Telecommunications / 통신" },
                          { value: "Utilities", label: "Utilities / 유틸리티" },
                          { value: "Defense", label: "Defense / 방산" },
                          { value: "Machinery", label: "Machinery / 기계" },
                          { value: "Shipbuilding", label: "Shipbuilding / 조선" },
                          // Regional specializations
                          { value: "Korea", label: "Korea / 한국" },
                          { value: "US", label: "US / 미국" },
                          { value: "Japan", label: "Japan / 일본" },
                          { value: "China", label: "China / 중국" },
                          { value: "Europe", label: "Europe / 유럽" },
                          { value: "ASEAN", label: "ASEAN / 아세안" },
                          { value: "Emerging Markets", label: "Emerging Markets / 신흥시장" },
                          { value: "Global", label: "Global / 글로벌" }
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
            )}

            {/* Portfolio Management Experience Fields */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-800">포트폴리오 운용경력(2025년8월기준)</h4>
              </div>
                
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
                            step="0.1"
                            placeholder="예: 5.5" 
                            {...field} 
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                            step="0.1"
                            placeholder="예: 3.2" 
                            {...field} 
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                        <FormLabel>운용펀드AUM (억원)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="예: 500.00" 
                            {...field} 
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                            placeholder="예: 3" 
                            {...field} 
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ownsOurShare"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Own Our Share?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ownership" />
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

              {form.watch("ownsOurShare") === "Yes" && (
                <FormField
                  control={form.control}
                  name="shareAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Share Amount</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., $100,000 or 5%" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional notes about this investor..." 
                  {...field} 
                  value={field.value ?? ""}
                  className="min-h-[80px]" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createInvestorMutation.isPending || updateInvestorMutation.isPending}>
            {investor 
              ? (updateInvestorMutation.isPending ? "Updating..." : "Update Investor")
              : (createInvestorMutation.isPending ? "Creating..." : "Create Investor")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}