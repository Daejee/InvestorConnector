import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Users, Plus, Edit, Trash2, MoreVertical, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CalendarScheduler from "@/components/scheduling/calendar-scheduler";
import { insertMeetingSchema, type Meeting, type Investor, type Analyst } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export default function Scheduling() {
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | undefined>();
  const [activeTab, setActiveTab] = useState("calendar");
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: upcomingMeetingsData = [] } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings/upcoming"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  // Edit form
  const editForm = useForm<any>({
    defaultValues: {
      attendeeType: "other",
      investorId: null,
      analystId: null,
      title: "",
      description: "",
      scheduledDate: new Date(),
      status: "scheduled",
    },
  });

  const watchedEditAttendeeType = editForm.watch("attendeeType");

  // Update meeting mutation
  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest("PATCH", `/api/meetings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/upcoming"] });
      setIsEditDialogOpen(false);
      setEditingMeeting(null);
      toast({
        title: "Meeting updated / 미팅 업데이트됨",
        description: "The meeting has been successfully updated / 미팅이 성공적으로 업데이트되었습니다",
      });
    },
  });

  // Delete meeting mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/upcoming"] });
      toast({
        title: "Meeting deleted / 미팅 삭제됨",
        description: "The meeting has been successfully deleted / 미팅이 성공적으로 삭제되었습니다",
      });
    },
  });

  const upcomingMeetings = upcomingMeetingsData;

  // Helper functions
  const handleViewMeeting = (meeting: Meeting) => {
    setViewingMeeting(meeting);
    setIsViewDialogOpen(true);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    editForm.reset({
      attendeeType: meeting.attendeeType || "other",
      investorId: meeting.investorId || undefined,
      analystId: meeting.analystId || undefined,
      title: meeting.title,
      description: meeting.description || "",
      scheduledDate: new Date(meeting.scheduledDate),
      status: meeting.status || "scheduled",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteMeeting = (id: number) => {
    if (confirm("Are you sure you want to delete this meeting? / 이 미팅을 삭제하시겠습니까?")) {
      deleteMeetingMutation.mutate(id);
    }
  };

  const onEditSubmit = (data: any) => {
    if (editingMeeting) {
      console.log('Edit form data being submitted:', data);
      const formattedData = {
        ...data,
        scheduledDate: data.scheduledDate.toISOString(),
      };
      console.log('Formatted edit data being sent:', formattedData);
      updateMeetingMutation.mutate({ id: editingMeeting.id, data: formattedData });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">미팅 스케줄러</h1>
          <p className="text-muted-foreground">
            Schedule meetings with investors using our interactive calendar / 대화형 캘린더로 투자자와 미팅을 예약하세요
          </p>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar Scheduler</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Meetings / 예정된 미팅</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <CalendarScheduler selectedInvestor={selectedInvestor} />
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Upcoming Meetings / 예정된 미팅
              </CardTitle>
              <CardDescription>
                Your scheduled meetings for the coming weeks / 앞으로 몇 주간 예정된 미팅
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No upcoming meetings / 예정된 미팅 없음</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Schedule your first meeting using the calendar scheduler / 캘린더 스케줄러를 사용하여 첫 미팅을 예약하세요
                  </p>
                  <Button onClick={() => setActiveTab("scheduler")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Schedule Meeting / 미팅 예약
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingMeetings.map((meeting) => {
                    const investor = investors.find(inv => inv.id === meeting.investorId);
                    const analyst = analysts.find(an => an.id === meeting.analystId);
                    
                    const getAttendeeName = () => {
                      if (meeting.attendeeType === 'investor' && investor) {
                        return investor.name;
                      } else if (meeting.attendeeType === 'analyst' && analyst) {
                        return analyst.name;
                      } else if (meeting.attendeeType === 'other') {
                        return 'Other / 기타';
                      } else {
                        return 'Other / 기타'; // fallback
                      }
                    };

                    const getAttendeeTypeLabel = () => {
                      switch (meeting.attendeeType) {
                        case 'investor': return 'Investor / 투자자';
                        case 'analyst': return 'Analyst / 애널리스트';
                        case 'other': return 'Other / 기타';
                        default: return 'Other / 기타';
                      }
                    };

                    return (
                      <div key={meeting.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                            <div className="text-xs font-medium text-blue-600">
                              {new Date(meeting.scheduledDate).toLocaleDateString('en-US', { month: 'short' })}
                            </div>
                            <div className="text-sm font-bold text-blue-800">
                              {new Date(meeting.scheduledDate).getDate()}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center text-sm text-gray-600 space-x-4">
                              <span className="flex items-center font-medium">
                                <Users className="mr-1 h-3 w-3" />
                                {getAttendeeName()}
                              </span>
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                                {getAttendeeTypeLabel()}
                              </span>
                              <span className="flex items-center">
                                <Clock className="mr-1 h-3 w-3" />
                                {new Date(meeting.scheduledDate).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewMeeting(meeting)}
                            className="text-xs px-3 py-1"
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditMeeting(meeting)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit / 편집
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteMeeting(meeting.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete / 삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Edit Meeting Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Meeting / 미팅 편집</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="attendeeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Type / 미팅 유형</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          editForm.setValue("investorId", null);
                          editForm.setValue("analystId", null);
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

                {watchedEditAttendeeType === "investor" && (
                  <FormField
                    control={editForm.control}
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

                {watchedEditAttendeeType === "analyst" && (
                  <FormField
                    control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
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

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel / 취소
                </Button>
                <Button type="submit" disabled={updateMeetingMutation.isPending}>
                  {updateMeetingMutation.isPending ? "Updating..." : "Update Meeting / 미팅 업데이트"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* View Meeting Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[750px]">
          <DialogHeader>
            <DialogTitle>Meeting Details / 미팅 상세정보</DialogTitle>
            <DialogDescription>
              View meeting information / 미팅 정보 보기
            </DialogDescription>
          </DialogHeader>
          {viewingMeeting && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Date / 날짜</h4>
                  <p className="text-sm">
                    {new Date(viewingMeeting.scheduledDate).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Time / 시간</h4>
                  <p className="text-sm">
                    {new Date(viewingMeeting.scheduledDate).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Attendee / 참석자</h4>
                <div className="flex items-center space-x-2">
                  <p className="text-sm">
                    {(() => {
                      const investor = investors.find(inv => inv.id === viewingMeeting.investorId);
                      const analyst = analysts.find(an => an.id === viewingMeeting.analystId);
                      
                      if (viewingMeeting.attendeeType === 'investor' && investor) {
                        return investor.name;
                      } else if (viewingMeeting.attendeeType === 'analyst' && analyst) {
                        return analyst.name;
                      } else {
                        return 'Other / 기타';
                      }
                    })()}
                  </p>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                    {(() => {
                      switch (viewingMeeting.attendeeType) {
                        case 'investor': return 'Investor / 투자자';
                        case 'analyst': return 'Analyst / 애널리스트';
                        case 'other': return 'Other / 기타';
                        default: return 'Other / 기타';
                      }
                    })()}
                  </span>
                </div>
              </div>

              {viewingMeeting.title && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Title / 제목</h4>
                  <p className="text-sm">{viewingMeeting.title}</p>
                </div>
              )}

              {viewingMeeting.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Description / 설명</h4>
                  <div className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                    {viewingMeeting.description}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Status / 상태</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(viewingMeeting.status)}`}>
                  {viewingMeeting.status}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close / 닫기
                </Button>
                <Button onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEditMeeting(viewingMeeting);
                }}>
                  Edit / 편집
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}