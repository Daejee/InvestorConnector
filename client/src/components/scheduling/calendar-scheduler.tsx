import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { insertMeetingSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Meeting, type Investor, type Analyst } from "@shared/schema";

interface CalendarSchedulerProps {
  selectedInvestor?: Investor;
}

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

const meetingTypes = [
  { value: "NDR/Conference", label: "NDR/Conference / NDR/컨퍼런스", duration: 60 },
  { value: "InOffice", label: "In Office / 사무실 미팅", duration: 30 },
  { value: "Other", label: "Other / 기타", duration: 45 }
];

export default function CalendarScheduler({ selectedInvestor }: CalendarSchedulerProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  const form = useForm<any>({
    defaultValues: {
      attendeeType: selectedInvestor ? "investor" : "other",
      investorId: selectedInvestor?.id || null,
      analystId: null,
      title: "",
      description: "",
      scheduledDate: selectedDate || new Date(),
      scheduledTime: selectedTime || "09:00",
      status: "scheduled",
    },
  });

  const watchedAttendeeType = form.watch("attendeeType");

  const createMeetingMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
        ...data,
        scheduledDate: new Date(data.scheduledDate).toISOString(),
        investorId: data.attendeeType === "investor" ? data.investorId : null,
        analystId: data.attendeeType === "analyst" ? data.analystId : null,
      };
      
      console.log("Form data being submitted:", formattedData);
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({
        title: "Success / 성공",
        description: "Meeting booked successfully / 미팅이 성공적으로 예약되었습니다",
      });
      setIsBookingOpen(false);
      form.reset();
      setSelectedDate(null);
      setSelectedTime("");
    },
    onError: (error: any) => {
      toast({
        title: "Error / 오류",
        description: error.message || "Failed to book meeting / 미팅 예약에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createMeetingMutation.mutate(data);
  };

  const { data: meetings = [], refetch: refetchMeetings } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Force refresh meetings when component mounts or when user navigates to this component
  useEffect(() => {
    refetchMeetings();
  }, [refetchMeetings]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const isTimeSlotBooked = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotDateTime = new Date(date);
    slotDateTime.setHours(hours, minutes, 0, 0);

    return meetings.some(meeting => {
      const meetingDate = new Date(meeting.scheduledDate);
      return Math.abs(meetingDate.getTime() - slotDateTime.getTime()) < 30 * 60 * 1000; // 30 minutes buffer
    });
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    if (isBefore(date, startOfDay(new Date()))) return;
    if (isTimeSlotBooked(date, time)) return;

    setSelectedDate(date);
    setSelectedTime(time);
    setIsBookingOpen(true);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Schedule Meeting / 미팅 일정 예약</span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {format(currentWeek, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Click on available time slots to schedule a meeting / 사용 가능한 시간대를 클릭하여 미팅을 예약하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-2">
            {/* Header row */}
            <div className="p-2 text-sm font-medium text-center">Time / 시간</div>
            {weekDays.map((day, index) => (
              <div key={index} className="p-2 text-sm font-medium text-center">
                <div>{format(day, 'EEE')}</div>
                <div className={`text-lg ${isToday(day) ? 'text-blue-600 font-bold' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}

            {/* Time slots */}
            {timeSlots.map((time) => (
              <div key={time} className="contents">
                <div className="p-2 text-sm text-center border-r border-gray-200">
                  {time}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const isPast = isBefore(day, startOfDay(new Date()));
                  const isBooked = isTimeSlotBooked(day, time);
                  const isSelected = selectedDate && isSameDay(day, selectedDate) && selectedTime === time;
                  
                  return (
                    <button
                      key={`${dayIndex}-${time}`}
                      onClick={() => handleTimeSlotClick(day, time)}
                      disabled={isPast || isBooked}
                      className={`
                        p-2 text-xs border border-gray-200 transition-colors
                        ${isPast ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                          isBooked ? 'bg-red-100 text-red-600 cursor-not-allowed' :
                          isSelected ? 'bg-blue-100 text-blue-600 border-blue-300' :
                          'bg-white hover:bg-green-50 hover:border-green-300 cursor-pointer'}
                      `}
                    >
                      {isPast ? 'Past' : isBooked ? 'Booked' : 'Available'}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Meeting Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-2xl">
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
                          // Reset IDs when changing type
                          form.setValue("investorId", null);
                          form.setValue("analystId", null);
                        }}
                        defaultValue={field.value}
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
                          defaultValue={selectedInvestor?.id?.toString() || ""}
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

              {selectedDate && selectedTime && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Meeting Details / 미팅 상세</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Meeting scheduled
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsBookingOpen(false)}>
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
    </div>
  );
}