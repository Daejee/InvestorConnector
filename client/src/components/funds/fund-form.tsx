import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { insertFundSchema, type InsertFund, type Company, type Fund } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FundFormProps {
  fund?: Fund;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FundForm({ fund, onSuccess, onCancel }: FundFormProps) {
  const { toast } = useToast();
  const [ownOurShares, setOwnOurShares] = useState(fund?.ownOurShares || false);

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const form = useForm<InsertFund>({
    resolver: zodResolver(insertFundSchema),
    defaultValues: {
      name: fund?.name || "",
      companyId: fund?.companyId || undefined,
      aum: fund?.aum || "",
      type: fund?.type || "",
      ownOurShares: fund?.ownOurShares || false,
      shareAmount: fund?.shareAmount || "",
    },
  });

  const createFundMutation = useMutation({
    mutationFn: async (data: InsertFund) => {
      const response = await apiRequest("POST", "/api/funds", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funds"] });
      toast({
        title: "Success",
        description: "Fund created successfully",
      });
      form.reset();
      setOwnOurShares(false);
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create fund",
        variant: "destructive",
      });
    },
  });

  const updateFundMutation = useMutation({
    mutationFn: async (data: InsertFund) => {
      const response = await apiRequest("PUT", `/api/funds/${fund!.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funds"] });
      toast({
        title: "Success",
        description: "Fund updated successfully",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update fund",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertFund) => {
    // If ownOurShares is false, clear shareAmount
    if (!data.ownOurShares) {
      data.shareAmount = "";
    }
    
    if (fund) {
      updateFundMutation.mutate(data);
    } else {
      createFundMutation.mutate(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fund Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter fund name" {...field} />
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
                <FormLabel>Company</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a company" />
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
                  <Input type="number" step="0.1" placeholder="Enter AUM in billions" {...field} />
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
                <FormLabel>Fund Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fund type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Value">Value</SelectItem>
                    <SelectItem value="Growth">Growth</SelectItem>
                    <SelectItem value="GARP">GARP</SelectItem>
                    <SelectItem value="Index">Index</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="ownOurShares"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setOwnOurShares(checked as boolean);
                      if (!checked) {
                        form.setValue("shareAmount", "");
                      }
                    }}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Own Our Shares</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Does this fund own shares in our company?
                  </p>
                </div>
              </FormItem>
            )}
          />

          {ownOurShares && (
            <FormField
              control={form.control}
              name="shareAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Share Amount</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter share amount or percentage" 
                      value={field.value || ""} 
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createFundMutation.isPending || updateFundMutation.isPending}
          >
            {fund ? (
              updateFundMutation.isPending ? "Updating..." : "Update Fund"
            ) : (
              createFundMutation.isPending ? "Creating..." : "Create Fund"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}