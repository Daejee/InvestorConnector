import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMeetingSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, MapPin, Calendar as CalendarIcon, Users } from "lucide-react";
import { format } from "date-fns";
import type { Investor, Analyst, User, OverseasInvestor } from "@shared/schema";

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
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: overseasInvestors = [] } = useQuery<OverseasInvestor[]>({
    queryKey: ["/api/overseas-investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<any>({
    defaultValues: {
      attendeeType: "investor",
      investorId: null,
      investorType: null,
      overseasInvestorId: null,
      analystId: null,
      assignedUserIds: [],
      title: "",
      description: "",
      scheduledDate: selectedDate || new Date(),
      scheduledTime: selectedTime || "09:00",
      status: "scheduled",
    },
  });

  const watchedAttendeeType = form.watch("attendeeType");
  const watchedDate = form.watch("scheduledDate");
  const watchedTime = form.watch("scheduledTime");
  const watchedAssignedUserIds = form.watch("assignedUserIds");

  // Reset form to correct defaults when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        attendeeType: "investor",
        investorId: null,
        analystId: null,
        assignedUserIds: [],
        title: "",
        description: "",
        scheduledDate: selectedDate || new Date(),
        scheduledTime: selectedTime || "09:00",
        status: "scheduled",
      });
    }
  }, [open, selectedDate, selectedTime]);

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
      form.reset({
        attendeeType: "investor",
        investorId: null,
        analystId: null,
        assignedUserIds: [],
        title: "",
        description: "",
        scheduledDate: selectedDate || new Date(),
        scheduledTime: selectedTime || "09:00",
        status: "scheduled",
      });
      onOpenChange(false);
      toast({
        title: "Meeting scheduled / 미팅이 예약되었습니다",
        description: "The meeting has been successfully scheduled / 미팅이 성공적으로 예약되었습니다",
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log('Form data being submitted:', data);
    
    // Combine date and time into a single Date object
    const [hours, minutes] = data.scheduledTime.split(':').map(Number);
    const meetingDate = new Date(data.scheduledDate);
    meetingDate.setHours(hours, minutes, 0, 0);
    
    const submitData = {
      ...data,
      scheduledDate: meetingDate,
    };
    
    createMeetingMutation.mutate(submitData);
  };

  // Format the selected date and time for display
  const formatDateTime = () => {
    const date = watchedDate || new Date();
    const time = watchedTime || "09:00";
    const dateString = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    return `${dateString} at ${time}`;
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
                      <Input
                        placeholder="투자자 이름 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                      <Select 
                        onValueChange={(value) => {
                          const [type, id] = value.split('-');
                          form.setValue('investorType', type);
                          if (type === 'domestic') {
                            field.onChange(parseInt(id));
                            form.setValue('overseasInvestorId', null);
                          } else if (type === 'overseas') {
                            form.setValue('overseasInvestorId', parseInt(id));
                            field.onChange(null);
                          }
                        }}
                        value={
                          form.watch('investorType') === 'overseas' 
                            ? `overseas-${form.watch('overseasInvestorId')}` 
                            : field.value 
                              ? `domestic-${field.value}` 
                              : ""
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose investor / 투자자를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {investors
                            .filter((investor) => 
                              investor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              investor.company.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((investor) => (
                              <SelectItem key={`domestic-${investor.id}`} value={`domestic-${investor.id}`}>
                                {investor.name} - {investor.company} (국내)
                              </SelectItem>
                            ))}
                          {overseasInvestors
                            .filter((investor) => 
                              investor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              investor.company.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((investor) => (
                              <SelectItem key={`overseas-${investor.id}`} value={`overseas-${investor.id}`}>
                                {investor.name} - {investor.company} (해외)
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
                      <Input
                        placeholder="애널리스트 이름 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose analyst / 애널리스트를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {analysts
                            .filter((analyst) => 
                              analyst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              analyst.company.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((analyst) => (
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

            {/* 미팅담당자 선택 섹션 */}
            <FormField
              control={form.control}
              name="assignedUserIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    미팅담당자
                  </FormLabel>
                  <div className="grid grid-cols-2 gap-3 max-h-32 overflow-y-auto border rounded-md p-3">
                    {users.map((user) => {
                      const isSelected = field.value?.includes(user.id.toString()) || false;
                      return (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const currentIds = field.value || [];
                              if (checked) {
                                field.onChange([...currentIds, user.id.toString()]);
                              } else {
                                field.onChange(currentIds.filter((id: string) => id !== user.id.toString()));
                              }
                            }}
                          />
                          <label
                            htmlFor={`user-${user.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {user.name}
                            {user.role && <span className="text-xs text-gray-500 ml-1">({user.role})</span>}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  {watchedAssignedUserIds?.length > 0 && (
                    <p className="text-sm text-gray-600">
                      선택된 담당자: {watchedAssignedUserIds.length}명
                    </p>
                  )}
                </FormItem>
              )}
            />

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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date / 날짜</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date / 날짜 선택</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time / 시간</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time / 시간 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="09:00">09:00</SelectItem>
                        <SelectItem value="09:30">09:30</SelectItem>
                        <SelectItem value="10:00">10:00</SelectItem>
                        <SelectItem value="10:30">10:30</SelectItem>
                        <SelectItem value="11:00">11:00</SelectItem>
                        <SelectItem value="11:30">11:30</SelectItem>
                        <SelectItem value="12:00">12:00</SelectItem>
                        <SelectItem value="12:30">12:30</SelectItem>
                        <SelectItem value="13:00">13:00</SelectItem>
                        <SelectItem value="13:30">13:30</SelectItem>
                        <SelectItem value="14:00">14:00</SelectItem>
                        <SelectItem value="14:30">14:30</SelectItem>
                        <SelectItem value="15:00">15:00</SelectItem>
                        <SelectItem value="15:30">15:30</SelectItem>
                        <SelectItem value="16:00">16:00</SelectItem>
                        <SelectItem value="16:30">16:30</SelectItem>
                        <SelectItem value="17:00">17:00</SelectItem>
                        <SelectItem value="17:30">17:30</SelectItem>
                        <SelectItem value="18:00">18:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
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