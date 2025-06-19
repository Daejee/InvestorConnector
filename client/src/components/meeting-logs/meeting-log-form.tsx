import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarDays } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { insertMeetingLogSchema, type InsertMeetingLog, type MeetingLog, type Investor } from "@shared/schema";
import { z } from "zod";

interface MeetingLogFormProps {
  meetingLog?: MeetingLog | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const placeOptions = [
  { value: "NDR/Conference", label: "NDR/Conference" },
  { value: "InOffice", label: "In Office" },
  { value: "Other", label: "Other" }
];

// Create a form schema that uses string for date input
const formSchema = insertMeetingLogSchema.extend({
  date: z.string().min(1, "Date is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function MeetingLogForm({ meetingLog, onSuccess, onCancel }: MeetingLogFormProps) {
  const queryClient = useQueryClient();

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: meetingLog?.date ? new Date(meetingLog.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      investorId: meetingLog?.investorId || 0,
      place: meetingLog?.place || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formattedData: InsertMeetingLog = {
        ...data,
        date: new Date(data.date),
      };
      const response = await fetch("/api/meeting-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData),
      });
      if (!response.ok) throw new Error("Failed to create meeting log");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-logs"] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formattedData: InsertMeetingLog = {
        ...data,
        date: new Date(data.date),
      };
      const response = await fetch(`/api/meeting-logs/${meetingLog?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData),
      });
      if (!response.ok) throw new Error("Failed to update meeting log");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-logs"] });
      onSuccess?.();
    },
  });

  const onSubmit = (data: FormData) => {
    if (meetingLog) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Date</FormLabel>
              <FormControl>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    {...field}
                    type="date"
                    className="pl-10"
                    placeholder="Select meeting date"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="investorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investor</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))} 
                value={field.value ? field.value.toString() : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an investor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {investors.map((investor: Investor) => (
                    <SelectItem key={investor.id} value={investor.id.toString()}>
                      {investor.name}
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
          name="place"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Place</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meeting place" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {placeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : meetingLog ? "Update Meeting Log" : "Create Meeting Log"}
          </Button>
        </div>
      </form>
    </Form>
  );
}