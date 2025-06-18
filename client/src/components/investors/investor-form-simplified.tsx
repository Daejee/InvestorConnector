import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      name: investor?.name || "",
      email: investor?.email || "",
      phone: investor?.phone || "",
      company: investor?.company || "",
      fund: investor?.fund || "",
      position: investor?.position || "",
      positionType: investor?.positionType || "",
      specialtyType: investor?.specialtyType || "",
      industryArea: investor?.industryArea || "",
      region: investor?.region || "",
      ownsOurShare: investor?.ownsOurShare || "",
      shareAmount: investor?.shareAmount || "",
      note: investor?.note || "",
      avatarInitials: investor?.avatarInitials || "",
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
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Essential Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter investor name" {...field} />
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
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email address" {...field} />
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
                      <SelectItem key={`company-${company.id}`} value={company.name}>
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
                      <SelectItem key={`fund-${fund.id}`} value={fund.name}>
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
              <span>Additional Details (Optional)</span>
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
                    <FormLabel>Position</FormLabel>
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
                  <FormLabel>Position Type</FormLabel>
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
              <>
                <FormField
                  control={form.control}
                  name="specialtyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialty type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="regional">Regional Specialist</SelectItem>
                          <SelectItem value="industry">Industry Specialist</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("specialtyType") === "industry" && (
                  <FormField
                    control={form.control}
                    name="industryArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry Area</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter specific industry area" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("specialtyType") === "regional" && (
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter specific region" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

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
                        <Input placeholder="e.g., $100,000 or 5%" {...field} />
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