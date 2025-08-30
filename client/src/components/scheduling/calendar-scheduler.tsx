import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, MapPin, Edit, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
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
  { value: "NDR/Conference", label: "NDR/컨퍼런스", duration: 60 },
  { value: "InOffice", label: "사무실 미팅", duration: 30 },
  { value: "Other", label: "기타", duration: 45 }
];

export default function CalendarScheduler({ selectedInvestor }: CalendarSchedulerProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<number>(60); // Default 1 hour
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  const { data: ndrConferences = [] } = useQuery<any[]>({
    queryKey: ["/api/ndr-conferences"],
  });

  const form = useForm<any>({
    defaultValues: {
      attendeeType: selectedInvestor ? "investor" : "investor",
      investorIds: selectedInvestor ? [selectedInvestor.id.toString()] : [],
      analystIds: [],
      ndrConferenceId: null,
      title: "",
      description: "",
      duration: 60, // Default 1 hour
      scheduledDate: selectedDate || new Date(),
      scheduledTime: selectedTime || "09:00",
      status: "scheduled",
      meetingCategory: "",
      location: "",
    },
  });

  const watchedAttendeeType = form.watch("attendeeType");
  const watchedMeetingCategory = form.watch("meetingCategory");

  const createMeetingMutation = useMutation({
    mutationFn: async (data: any) => {
      // Create the scheduled date by combining the selected date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledDateTime = new Date(selectedDate!);
      scheduledDateTime.setHours(hours, minutes, 0, 0);
      
      // If the meeting is in the past, set status to "completed"
      const isPastMeeting = scheduledDateTime < new Date();
      
      const formattedData = {
        ...data,
        scheduledDate: scheduledDateTime.toISOString(),
        investorIds: data.attendeeType === "investor" ? data.investorIds : null,
        analystIds: data.attendeeType === "analyst" ? data.analystIds : null,
        status: isPastMeeting ? "completed" : "scheduled",
        title: data.title || data.meetingCategory || "미팅", // Use category as title if title is empty
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
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/upcoming"] });
      refetchMeetings(); // Force immediate refresh
      toast({
        title: "성공",
        description: "미팅이 성공적으로 예약되었습니다",
      });
      setIsBookingOpen(false);
      form.reset({
        attendeeType: "investor",
        investorIds: selectedInvestor ? [selectedInvestor.id.toString()] : [],
        analystId: null,
        ndrConferenceId: null,
        title: "",
        description: "",
        scheduledDate: selectedDate || new Date(),
        scheduledTime: selectedTime || "09:00",
        status: "scheduled",
        meetingCategory: "",
        location: "",
      });
      setSelectedDate(null);
      setSelectedTime("");
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "미팅 예약에 실패했습니다",
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

  // Reset form with correct defaults when booking dialog opens
  useEffect(() => {
    if (isBookingOpen) {
      form.reset({
        attendeeType: "investor",
        investorIds: selectedInvestor ? [selectedInvestor.id.toString()] : [],
        analystId: null,
        ndrConferenceId: null,
        title: "",
        description: "",
        scheduledDate: selectedDate || new Date(),
        scheduledTime: selectedTime || "09:00",
        status: "scheduled",
        meetingCategory: "",
        location: "",
      });
    }
  }, [isBookingOpen, selectedInvestor, selectedDate, selectedTime]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const getMeetingForTimeSlot = (date: Date, time: string) => {
    if (!meetings || meetings.length === 0) return null;
    
    const [hours, minutes] = time.split(':').map(Number);
    const slotDateTime = new Date(date);
    slotDateTime.setHours(hours, minutes, 0, 0);
    const slotEndTime = new Date(slotDateTime.getTime() + 30 * 60000); // 30 minute slot

    return meetings.find(meeting => {
      const meetingDate = new Date(meeting.scheduledDate);
      const meetingDuration = meeting.duration || 60; // Default 1 hour
      const meetingEndTime = new Date(meetingDate.getTime() + meetingDuration * 60000);
      
      // Check if same day
      const slotDateLocal = format(slotDateTime, 'yyyy-MM-dd');
      const meetingDateLocal = format(meetingDate, 'yyyy-MM-dd');
      const isSameDay = slotDateLocal === meetingDateLocal;
      
      if (!isSameDay) return false;
      
      // Check for time overlap: meetings overlap if one starts before the other ends
      const overlaps = (slotDateTime < meetingEndTime) && (slotEndTime > meetingDate);
      
      return overlaps;
    }) || null;
  };

  // Check if this slot is the start time of a meeting
  const isMeetingStartSlot = (date: Date, time: string, meeting: Meeting) => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotDateTime = new Date(date);
    slotDateTime.setHours(hours, minutes, 0, 0);
    
    const meetingDate = new Date(meeting.scheduledDate);
    
    return slotDateTime.getTime() === meetingDate.getTime();
  };

  const isTimeSlotBooked = (date: Date, time: string, duration: number = 60) => {
    return getMeetingForTimeSlot(date, time) !== null;
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    console.log("handleTimeSlotClick called:", { date, time });
    
    // Check if there's a meeting at this time slot
    const meeting = getMeetingForTimeSlot(date, time);
    console.log("Meeting found:", meeting);
    
    if (meeting) {
      console.log("Navigating to edit meeting:", meeting.id);
      // Navigate to meetings page with meeting ID to edit
      window.location.href = `/meetings?edit=${meeting.id}`;
      return;
    }

    console.log("No meeting found, opening booking dialog");
    setSelectedDate(date);
    setSelectedTime(time);
    setIsBookingOpen(true);
  };

  // Get attendee name for display
  const getAttendeeName = (meeting: Meeting) => {
    if (meeting.investorIds && meeting.investorIds.length > 0) {
      const names = meeting.investorIds.map(id => {
        const investor = investors.find(inv => inv.id.toString() === id);
        return investor ? investor.name : "Unknown";
      });
      return names.join(", ");
    }
    if (meeting.analystIds && meeting.analystIds.length > 0) {
      const names = meeting.analystIds.map(id => {
        const analyst = analysts.find(ana => ana.id.toString() === id);
        return analyst ? analyst.name : "Unknown";
      });
      return names.join(", ");
    }
    // Backward compatibility
    if (meeting.analystId) {
      const analyst = analysts.find(ana => ana.id === meeting.analystId);
      return analyst ? analyst.name : "Unknown";
    }
    return "Other";
  };

  // Get attendee company for display
  const getAttendeeCompany = (meeting: Meeting) => {
    if (meeting.investorIds && meeting.investorIds.length > 0) {
      const companies = meeting.investorIds.map(id => {
        const investor = investors.find(inv => inv.id.toString() === id);
        return investor ? investor.company : "";
      }).filter(c => c !== "");
      return Array.from(new Set(companies)).join(", ");
    }
    if (meeting.analystIds && meeting.analystIds.length > 0) {
      const companies = meeting.analystIds.map(id => {
        const analyst = analysts.find(ana => ana.id.toString() === id);
        return analyst ? analyst.company : "";
      }).filter(c => c !== "");
      return Array.from(new Set(companies)).join(", ");
    }
    // Backward compatibility
    if (meeting.analystId) {
      const analyst = analysts.find(ana => ana.id === meeting.analystId);
      return analyst ? analyst.company : "Unknown Company";
    }
    return "Other";
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>미팅 일정 예약</span>
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
            사용 가능한 시간대를 클릭하여 미팅을 예약하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-2">
            {/* Header row */}
            <div className="p-2 text-sm font-medium text-center">시간</div>
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
                  const meeting = getMeetingForTimeSlot(day, time);
                  const isBooked = meeting !== null;
                  const isSelected = selectedDate && isSameDay(day, selectedDate) && selectedTime === time;
                  const isStartSlot = meeting && isMeetingStartSlot(day, time, meeting);
                  
                  return (
                    <button
                      key={`${dayIndex}-${time}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleTimeSlotClick(day, time);
                      }}
                      className={`
                        p-1 text-xs border border-gray-200 transition-colors min-h-[60px] flex flex-col justify-center relative
                        ${isPast && !isBooked ? 'bg-gray-50 text-gray-500 cursor-pointer hover:bg-gray-100' :
                          isBooked ? (isStartSlot ? 'bg-blue-50 text-blue-800 cursor-pointer hover:bg-blue-100' : 'bg-blue-100/30 border-blue-200 cursor-pointer text-blue-600') :
                          isSelected ? 'bg-blue-100 text-blue-600 border-blue-300' :
                          'bg-white hover:bg-green-50 hover:border-green-300 cursor-pointer'}
                      `}
                    >
                      {isPast && !isBooked ? (
                        <span className="text-gray-500">Past</span>
                      ) : isBooked && meeting ? (
                        isStartSlot ? (
                          <div 
                            className="space-y-1 w-full h-full"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log("Meeting card clicked:", meeting.id);
                              window.location.href = `/meetings?edit=${meeting.id}`;
                            }}
                          >
                            <div className="text-xs text-blue-700 truncate font-medium">
                              {getAttendeeName(meeting)}
                            </div>
                            <div className="text-xs text-blue-600 truncate">
                              {getAttendeeCompany(meeting)}
                            </div>
                            <div className="flex items-center text-xs text-blue-600">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="text-xs text-blue-600 w-full h-full flex items-center justify-center"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log("Meeting continuation clicked:", meeting.id);
                              window.location.href = `/meetings?edit=${meeting.id}`;
                            }}
                          >
                            ⬆ {meeting.title || "Meeting"}
                          </div>
                        )
                      ) : (
                        <span>Available</span>
                      )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && isBefore(selectedDate, startOfDay(new Date())) ? 
                "미팅 기록" : 
                "미팅 예약"
              }
            </DialogTitle>
            <DialogDescription>
              {selectedDate && isBefore(selectedDate, startOfDay(new Date())) ? 
                "이미 진행된 미팅 기록 추가" :
                "유연한 시간 옵션으로 새 미팅 예약"
              }
            </DialogDescription>
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
                          form.setValue("investorIds", []);
                          form.setValue("analystIds", []);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="미팅 유형 선택" />
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

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration / 미팅 길이</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                          setSelectedDuration(parseInt(value));
                        }}
                        defaultValue="60"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="길이 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="30">30분 (30 minutes)</SelectItem>
                          <SelectItem value="60">1시간 (1 hour)</SelectItem>
                          <SelectItem value="90">1시간 30분 (1.5 hours)</SelectItem>
                          <SelectItem value="120">2시간 (2 hours)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Meeting Category Selection */}
                <FormField
                  control={form.control}
                  name="meetingCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Category / 미팅 종류</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="미팅 종류 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="탐방">탐방</SelectItem>
                          <SelectItem value="Conference Call">Conference Call</SelectItem>
                          <SelectItem value="실적발표회 Earnings Call">실적발표회 Earnings Call</SelectItem>
                          <SelectItem value="국내CorpDay">국내CorpDay</SelectItem>
                          <SelectItem value="국내NDR">국내NDR</SelectItem>
                          <SelectItem value="해외CorpDay">해외CorpDay</SelectItem>
                          <SelectItem value="해외NDR">해외NDR</SelectItem>
                          <SelectItem value="기타">기타</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Location Field */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location / 장소</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder="미팅 장소 입력"
                          className="w-full"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* NDR/Conference Selection - Show when NDR or CorpDay categories are selected */}
              {(watchedMeetingCategory === "국내CorpDay" || watchedMeetingCategory === "국내NDR" || 
                watchedMeetingCategory === "해외CorpDay" || watchedMeetingCategory === "해외NDR") && (
                <FormField
                  control={form.control}
                  name="ndrConferenceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select NDR/Conference / NDR/컨퍼런스 선택</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="NDR/컨퍼런스를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ndrConferences.map((conference) => (
                            <SelectItem key={conference.id} value={conference.id.toString()}>
                              {conference.name} - {conference.cityHeld}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              {watchedAttendeeType === "investor" && (
                <FormField
                  control={form.control}
                  name="investorIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Investors / 투자자 선택</FormLabel>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          {field.value && field.value.length > 0 
                            ? `${field.value.length} investors selected / ${field.value.length}명의 투자자가 선택됨`
                            : "선택된 투자자 없음"
                          }
                        </div>
                        <div className="border rounded-lg max-h-32 overflow-y-auto p-2">
                          {investors.map((investor) => {
                            const isSelected = field.value?.includes(investor.id.toString()) || false;
                            return (
                              <div key={investor.id} className="flex items-center space-x-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const currentIds = field.value || [];
                                    if (e.target.checked) {
                                      field.onChange([...currentIds, investor.id.toString()]);
                                    } else {
                                      field.onChange(currentIds.filter((id: string) => id !== investor.id.toString()));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label className="text-sm cursor-pointer flex-1" onClick={() => {
                                  const currentIds = field.value || [];
                                  const isCurrentlySelected = currentIds.includes(investor.id.toString());
                                  if (isCurrentlySelected) {
                                    field.onChange(currentIds.filter((id: string) => id !== investor.id.toString()));
                                  } else {
                                    field.onChange([...currentIds, investor.id.toString()]);
                                  }
                                }}>
                                  {investor.name} - {investor.company}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {watchedAttendeeType === "analyst" && (
                <FormField
                  control={form.control}
                  name="analystIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Analysts / 애널리스트 선택</FormLabel>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">
                          {field.value && field.value.length > 0 
                            ? `${field.value.length} analysts selected / ${field.value.length}명의 애널리스트가 선택됨`
                            : "선택된 애널리스트 없음"
                          }
                        </div>
                        <div className="border rounded-lg max-h-32 overflow-y-auto p-2">
                          {analysts.map((analyst) => {
                            const isSelected = field.value?.includes(analyst.id.toString()) || false;
                            return (
                              <div key={analyst.id} className="flex items-center space-x-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const currentIds = field.value || [];
                                    if (e.target.checked) {
                                      field.onChange([...currentIds, analyst.id.toString()]);
                                    } else {
                                      field.onChange(currentIds.filter((id: string) => id !== analyst.id.toString()));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label className="text-sm cursor-pointer flex-1" onClick={() => {
                                  const currentIds = field.value || [];
                                  const isCurrentlySelected = currentIds.includes(analyst.id.toString());
                                  if (isCurrentlySelected) {
                                    field.onChange(currentIds.filter((id: string) => id !== analyst.id.toString()));
                                  } else {
                                    field.onChange([...currentIds, analyst.id.toString()]);
                                  }
                                }}>
                                  {analyst.name} - {analyst.company}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              )}



              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description / 설명</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="미팅 안건 또는 메모"
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
                      <Clock className="h-4 w-4 mr-2" />
                      Duration: {selectedDuration} minutes / 길이: {selectedDuration}분
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Meeting will be scheduled / 미팅이 예약됩니다
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsBookingOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={createMeetingMutation.isPending}>
                  {createMeetingMutation.isPending ? "예약 중..." : "미팅 예약"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}