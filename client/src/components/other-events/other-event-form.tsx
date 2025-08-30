import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { insertOtherEventSchema, type InsertOtherEvent, type OtherEvent, type Investor, type Analyst } from "@shared/schema";
import { z } from "zod";
import { useState } from "react";

interface OtherEventFormProps {
  event?: OtherEvent | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Create a form schema that uses string for date inputs
const formSchema = insertOtherEventSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  attendees: z.array(z.string()).default([]),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function OtherEventForm({ event, onSuccess, onCancel }: OtherEventFormProps) {
  const queryClient = useQueryClient();
  const [newAttendee, setNewAttendee] = useState("");
  const [attendeeType, setAttendeeType] = useState<"analyst" | "investor" | "custom">("custom");
  const [selectedAnalysts, setSelectedAnalysts] = useState<number[]>([]);
  const [selectedInvestors, setSelectedInvestors] = useState<number[]>([]);

  // Fetch analysts and investors
  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: event?.name || "",
      eventType: event?.eventType || "Other",
      startDate: event?.startDate ? new Date(event.startDate).toISOString().split('T')[0] : "",
      endDate: event?.endDate ? new Date(event.endDate).toISOString().split('T')[0] : "",
      location: event?.location || "",
      organizer: event?.organizer || "",
      description: event?.description || "",
      attendees: event?.attendees || [],
      status: event?.status || "scheduled",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formattedData: InsertOtherEvent = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      };
      const response = await fetch("/api/other-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formattedData,
          startDate: formattedData.startDate.toISOString(),
          endDate: formattedData.endDate?.toISOString() || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to create event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/other-events"] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formattedData: InsertOtherEvent = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      };
      const response = await fetch(`/api/other-events/${event?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formattedData,
          startDate: formattedData.startDate.toISOString(),
          endDate: formattedData.endDate?.toISOString() || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to update event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/other-events"] });
      onSuccess?.();
    },
  });

  const onSubmit = (data: FormData) => {
    if (event) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addAttendee = () => {
    if (newAttendee.trim()) {
      const currentAttendees = form.getValues("attendees");
      if (!currentAttendees.includes(newAttendee.trim())) {
        form.setValue("attendees", [...currentAttendees, newAttendee.trim()]);
        setNewAttendee("");
      }
    }
  };

  const removeAttendee = (attendeeToRemove: string) => {
    const currentAttendees = form.getValues("attendees");
    form.setValue("attendees", currentAttendees.filter(a => a !== attendeeToRemove));
  };

  const handleAnalystSelection = (analystId: number, checked: boolean) => {
    console.log("Analyst selection:", analystId, checked);
    setSelectedAnalysts(prev => {
      const newSelection = checked 
        ? [...prev, analystId] 
        : prev.filter(id => id !== analystId);
      console.log("New selected analysts:", newSelection);
      return newSelection;
    });
  };

  const handleInvestorSelection = (investorId: number, checked: boolean) => {
    console.log("Investor selection:", investorId, checked);
    setSelectedInvestors(prev => {
      const newSelection = checked 
        ? [...prev, investorId] 
        : prev.filter(id => id !== investorId);
      console.log("New selected investors:", newSelection);
      return newSelection;
    });
  };

  const addSelectedAttendees = () => {
    const currentAttendees = form.getValues("attendees");
    let newAttendees: string[] = [];

    if (attendeeType === "analyst") {
      newAttendees = selectedAnalysts.map(id => {
        const analyst = analysts.find(a => a.id === id);
        return analyst ? `${analyst.name} (${analyst.company})` : "";
      }).filter(Boolean);
    } else if (attendeeType === "investor") {
      newAttendees = selectedInvestors.map(id => {
        const investor = investors.find(i => i.id === id);
        return investor ? `${investor.name} (${investor.company})` : "";
      }).filter(Boolean);
    }

    const uniqueAttendees = [...currentAttendees];
    newAttendees.forEach(attendee => {
      if (!uniqueAttendees.includes(attendee)) {
        uniqueAttendees.push(attendee);
      }
    });

    form.setValue("attendees", uniqueAttendees);
    setSelectedAnalysts([]);
    setSelectedInvestors([]);
  };

  const attendees = form.watch("attendees");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Event Name / 이벤트명</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Annual Company Workshop 2025"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Type / 이벤트 유형</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type / 이벤트 유형 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Roadshow">Roadshow</SelectItem>
                    <SelectItem value="Workshop">Workshop</SelectItem>
                    <SelectItem value="Conference">Conference</SelectItem>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status / 상태</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status / 상태 선택" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled / 예정</SelectItem>
                    <SelectItem value="ongoing">Ongoing / 진행중</SelectItem>
                    <SelectItem value="completed">Completed / 완료</SelectItem>
                    <SelectItem value="cancelled">Cancelled / 취소</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date / 시작일</FormLabel>
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
                <FormLabel>End Date / 종료일 (Optional)</FormLabel>
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
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location / 장소</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Seoul Conference Center, Online"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="organizer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organizer / 주최자</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Company Name, External Partner"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Attendees Section */}
          <div className="md:col-span-2">
            <FormLabel>참석자 (Optional)</FormLabel>
            <div className="mt-2 space-y-4">
              {/* Attendee Type Selection */}
              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="attendeeType"
                    value="analyst"
                    checked={attendeeType === "analyst"}
                    onChange={(e) => setAttendeeType(e.target.value as "analyst")}
                  />
                  <span>애널리스트</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="attendeeType"
                    value="investor"
                    checked={attendeeType === "investor"}
                    onChange={(e) => setAttendeeType(e.target.value as "investor")}
                  />
                  <span>투자자</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="attendeeType"
                    value="custom"
                    checked={attendeeType === "custom"}
                    onChange={(e) => setAttendeeType(e.target.value as "custom")}
                  />
                  <span>직접입력</span>
                </label>
              </div>

              {/* Analyst Selection */}
              {attendeeType === "analyst" && (
                <div className="space-y-3">
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
                    {analysts.map((analyst) => (
                      <div key={analyst.id} className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedAnalysts.includes(analyst.id)}
                          onChange={(e) => 
                            handleAnalystSelection(analyst.id, e.target.checked)
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{analyst.name} ({analyst.company})</span>
                      </div>
                    ))}
                  </div>
                  {selectedAnalysts.length > 0 && (
                    <Button type="button" onClick={addSelectedAttendees} variant="outline" size="sm">
                      선택한 애널리스트 추가 ({selectedAnalysts.length}명)
                    </Button>
                  )}
                </div>
              )}

              {/* Investor Selection */}
              {attendeeType === "investor" && (
                <div className="space-y-3">
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
                    {investors.map((investor) => (
                      <div key={investor.id} className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedInvestors.includes(investor.id)}
                          onChange={(e) => 
                            handleInvestorSelection(investor.id, e.target.checked)
                          }
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{investor.name} ({investor.company})</span>
                      </div>
                    ))}
                  </div>
                  {selectedInvestors.length > 0 && (
                    <Button type="button" onClick={addSelectedAttendees} variant="outline" size="sm">
                      선택한 투자자 추가 ({selectedInvestors.length}명)
                    </Button>
                  )}
                </div>
              )}

              {/* Custom Input */}
              {attendeeType === "custom" && (
                <div className="flex gap-2">
                  <Input
                    placeholder="참석자 이름 또는 회사명 입력..."
                    value={newAttendee}
                    onChange={(e) => setNewAttendee(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAttendee();
                      }
                    }}
                  />
                  <Button type="button" onClick={addAttendee}>
                    추가
                  </Button>
                </div>
              )}
              
              {/* Selected Attendees Display */}
              {attendees.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">선택된 참석자:</span>
                  <div className="flex flex-wrap gap-2">
                    {attendees.map((attendee, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {attendee}
                        <X
                          className="ml-2 h-3 w-3 cursor-pointer"
                          onClick={() => removeAttendee(attendee)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description / 설명 (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the event, agenda, or additional notes..."
                    className="h-24"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4 pt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending 
              ? "Saving..." 
              : event 
                ? "Update Event / 이벤트 수정" 
                : "Add Event"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}