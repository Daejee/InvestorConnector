import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookMeetingDialog } from "@/components/scheduling/book-meeting-dialog";
import { type Meeting, type Investor } from "@shared/schema";

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
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
      <BookMeetingDialog 
        open={isBookingOpen} 
        onOpenChange={setIsBookingOpen}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
      />
    </div>
  );
}