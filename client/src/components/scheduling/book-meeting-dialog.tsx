import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMeetingSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Clock, MapPin } from "lucide-react";
import type { Investor, Analyst } from "@shared/schema";

interface BookMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  selectedTime?: string;
}

export function BookMeetingDialog({ 
  open, 
  onOpenChange, 
  selectedDate = new Date(), 
  selectedTime = "09:00" 
}: BookMeetingDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  const form = useForm({
    resolver: zodResolver(insertMeetingSchema),
    defaultValues: {
      attendeeType: "other" as const,
      investorId: null,
      analystId: null,
      title: "",
      description: "",
      scheduledDate: new Date(selectedDate),
      status: "scheduled" as const,
    },
  });

  const watchedAttendeeType = form.watch("attendeeType");

  const createMeetingMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        scheduledDate: data.scheduledDate.toISOString(),
      };
      return apiRequest("POST", "/api/meetings", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/upcoming"] });
      form.reset();
      onOpenChange(false);
      toast({
        title: "Meeting scheduled / 미팅이 예약되었습니다",
        description: "The meeting has been successfully scheduled / 미팅이 성공적으로 예약되었습니다",
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log('Form data being submitted:', data);
    createMeetingMutation.mutate(data);
  };

  // Format the selected date and time for display
  const formatDateTime = () => {
    const date = selectedDate;
    const dateString = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    return `${dateString} at ${selectedTime}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book Meeting / 미팅 예약</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="attendeeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Type / 미팅 유형</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("investorId", null);
                        form.setValue("analystId", null);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select meeting type / 미팅 유형 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="investor">Investor / 투자자</SelectItem>
                        <SelectItem value="analyst">Analyst / 애널리스트</SelectItem>
                        <SelectItem value="other">Other / 기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {watchedAttendeeType === "investor" && (
                <FormField
                  control={form.control}
                  name="investorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Investor / 투자자 선택</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose investor / 투자자를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {investors.map((investor) => (
                            <SelectItem key={investor.id} value={investor.id.toString()}>
                              {investor.name} - {investor.company}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              {watchedAttendeeType === "analyst" && (
                <FormField
                  control={form.control}
                  name="analystId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Analyst / 애널리스트 선택</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose analyst / 애널리스트를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {analysts.map((analyst) => (
                            <SelectItem key={analyst.id} value={analyst.id.toString()}>
                              {analyst.name} - {analyst.company}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Title / 미팅 제목</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter meeting title / 미팅 제목 입력" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / 설명</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Meeting agenda or notes / 미팅 안건 또는 메모"
                      rows={3}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Meeting Details / 미팅 상세</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  {formatDateTime()}
                </div>
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Meeting scheduled
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel / 취소
              </Button>
              <Button type="submit" disabled={createMeetingMutation.isPending}>
                {createMeetingMutation.isPending ? "Booking..." : "Book Meeting / 미팅 예약"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}