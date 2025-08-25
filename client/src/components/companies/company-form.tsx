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
      hqLocation: company?.hqLocation || "",
      aum: company ? parseFloat(company.aum).toString() : "",
      type: company?.type || "",
      area: company?.area || "",
      shareholderStatus: company?.shareholderStatus || "N/A",
      shareCount: company?.shareCount || "",
      // New fields
      fundManagerCount: company?.fundManagerCount || undefined,
      establishedDate: company?.establishedDate || "",
      address: company?.address || "",
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
        title: "Success",
        description: "Company created successfully",
      });
      form.reset();
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create company",
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
        title: "Success",
        description: "Company updated successfully",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update company",
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
        {/* First row - Company name spans full width */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter company name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="hqLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HQ Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter headquarters location" {...field} />
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
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company type (e.g., VC, PE, Hedge Fund)" {...field} />
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
                  <FormLabel>주주여부 / Shareholder Status</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    if (value !== "Yes") {
                      form.setValue("shareCount", "");
                    }
                  }} defaultValue={field.value || "N/A"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shareholder status" />
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
              name="establishedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설립일자</FormLabel>
                  <FormControl>
                    <Input type="date" placeholder="설립일자를 선택하세요" value={field.value || ""} onChange={field.onChange} />
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
                    <Input type="number" placeholder="예: 45000 (4조5천억원), 3210 (3천2백10억원)" {...field} />
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
                  <FormLabel>Area</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="US">US</SelectItem>
                      <SelectItem value="EU">EU</SelectItem>
                      <SelectItem value="Hong Kong">Hong Kong</SelectItem>
                      <SelectItem value="Singapore">Singapore</SelectItem>
                      <SelectItem value="Korea">Korea</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Input type="number" placeholder="펀드 매니저 수를 입력하세요" value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} />
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
                  <FormLabel>주소</FormLabel>
                  <FormControl>
                    <Input placeholder="회사 주소를 입력하세요" value={field.value || ""} onChange={field.onChange} />
                  </FormControl>
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
                <FormLabel>주식수 / Share Count</FormLabel>
                <FormControl>
                  <Input placeholder="Enter number of shares" value={field.value || ""} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createCompanyMutation.isPending || updateCompanyMutation.isPending}
          >
            {company ? (
              updateCompanyMutation.isPending ? "Updating..." : "Update Company"
            ) : (
              createCompanyMutation.isPending ? "Creating..." : "Create Company"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
