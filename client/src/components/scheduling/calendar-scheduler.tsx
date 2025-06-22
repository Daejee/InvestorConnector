import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMeetingSchema, type Meeting, type Investor } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const form = useForm({
    resolver: zodResolver(insertMeetingSchema),
    defaultValues: {
      investorId: selectedInvestor?.id || undefined,
      title: "",
      description: "",
      place: "InOffice" as const,
      scheduledDate: new Date(),
      status: "scheduled" as const,
    },
  });

  const createMeetingMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/meetings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setIsBookingOpen(false);
      setSelectedDate(null);
      setSelectedTime("");
      form.reset();
      toast({
        title: "Meeting scheduled successfully",
        description: "The meeting has been added to your calendar.",
      });
    },
  });

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
    
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledDateTime = new Date(date);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    
    form.setValue("scheduledDate", scheduledDateTime);
    setIsBookingOpen(true);
  };

  const onSubmit = (data: any) => {
    createMeetingMutation.mutate(data);
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
                  name="investorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investor / 투자자</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={selectedInvestor?.id?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select investor / 투자자 선택" />
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
                <FormField
                  control={form.control}
                  name="place"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Type / 미팅 유형</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {meetingTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label} ({type.duration}min)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
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
                      {meetingTypes.find(t => t.value === form.watch('place'))?.label}
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