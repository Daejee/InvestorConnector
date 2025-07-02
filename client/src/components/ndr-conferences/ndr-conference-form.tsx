import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { insertNdrConferenceSchema, type InsertNdrConference, type NdrConference, type SecuritiesFirm } from "@shared/schema";
import { z } from "zod";
import { useState } from "react";

interface NdrConferenceFormProps {
  conference?: NdrConference | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Create a form schema that uses string for date inputs
const formSchema = insertNdrConferenceSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  participatingCompanies: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

export default function NdrConferenceForm({ conference, onSuccess, onCancel }: NdrConferenceFormProps) {
  const queryClient = useQueryClient();
  
  const { data: securitiesFirms = [] } = useQuery<SecuritiesFirm[]>({
    queryKey: ["/api/securities-firms"],
  });
  const [newCompany, setNewCompany] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: conference?.name || "",
      startDate: conference?.startDate ? new Date(conference.startDate).toISOString().split('T')[0] : "",
      endDate: conference?.endDate ? new Date(conference.endDate).toISOString().split('T')[0] : "",
      place: conference?.place || "",
      cityHeld: conference?.cityHeld || "",
      hostCompany: conference?.hostCompany || "",
      participatingCompanies: conference?.participatingCompanies || [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formattedData: InsertNdrConference = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      };
      const response = await fetch("/api/ndr-conferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formattedData,
          startDate: formattedData.startDate.toISOString(),
          endDate: formattedData.endDate.toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to create conference");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ndr-conferences"] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formattedData: InsertNdrConference = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      };
      const response = await fetch(`/api/ndr-conferences/${conference?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formattedData,
          startDate: formattedData.startDate.toISOString(),
          endDate: formattedData.endDate.toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to update conference");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ndr-conferences"] });
      onSuccess?.();
    },
  });

  const onSubmit = (data: FormData) => {
    if (conference) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addParticipatingCompany = () => {
    if (newCompany.trim()) {
      const currentCompanies = form.getValues("participatingCompanies");
      if (!currentCompanies.includes(newCompany.trim())) {
        form.setValue("participatingCompanies", [...currentCompanies, newCompany.trim()]);
        setNewCompany("");
      }
    }
  };

  const removeParticipatingCompany = (companyToRemove: string) => {
    const currentCompanies = form.getValues("participatingCompanies");
    form.setValue("participatingCompanies", currentCompanies.filter(c => c !== companyToRemove));
  };

  const participatingCompanies = form.watch("participatingCompanies");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Event Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Goldman Sachs Technology Conference 2025"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="place"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place/Venue</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Marriott Marquis, Virtual Conference"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cityHeld"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., New York, San Francisco"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hostCompany"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Host Company / 주최사</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select host securities firm / 주최 증권사 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {securitiesFirms.map((firm) => (
                      <SelectItem key={firm.id} value={firm.name}>
                        {firm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <FormLabel>Participating Companies</FormLabel>
          <div className="mt-2 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add participating company"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addParticipatingCompany())}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addParticipatingCompany}
                disabled={!newCompany.trim()}
              >
                Add
              </Button>
            </div>
            
            {participatingCompanies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {participatingCompanies.map((company, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {company}
                    <button
                      type="button"
                      onClick={() => removeParticipatingCompany(company)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : conference
              ? "Update Conference"
              : "Create Conference"}
          </Button>
        </div>
      </form>
    </Form>
  );
}