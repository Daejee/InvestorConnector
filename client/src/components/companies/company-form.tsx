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
}

export default function CompanyForm({ company, onSuccess, onCancel }: CompanyFormProps) {
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
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      const response = await apiRequest("POST", "/api/companies", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
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
      const response = await apiRequest("PUT", `/api/companies/${company!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
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
          name="aum"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AUM / 운용자산 (1000억원 단위)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="예: 450 (45조원), 32.1 (3조2100억원)" {...field} />
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
