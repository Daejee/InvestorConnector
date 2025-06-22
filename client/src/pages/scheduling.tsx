import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Users, Plus, Edit, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [activeTab, setActiveTab] = useState("upcoming");
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  // Delete meeting mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({
        title: "Meeting deleted / 미팅 삭제됨",
        description: "The meeting has been successfully deleted / 미팅이 성공적으로 삭제되었습니다",
      });
    },
  });

  // Edit form
  const editForm = useForm({
    resolver: zodResolver(insertMeetingSchema),
    defaultValues: {
      attendeeType: "other" as const,
      investorId: null,
      analystId: null,
      title: "",
      description: "",
      scheduledDate: new Date(),
      status: "scheduled" as const,
    },
  });

  const watchedEditAttendeeType = editForm.watch("attendeeType");

  // Update meeting mutation
  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest("PATCH", `/api/meetings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setIsEditDialogOpen(false);
      setEditingMeeting(null);
      toast({
        title: "Meeting updated / 미팅 업데이트됨",
        description: "The meeting has been successfully updated / 미팅이 성공적으로 업데이트되었습니다",
      });
    },
  });

  const upcomingMeetings = meetings
    .filter(meeting => new Date(meeting.scheduledDate) > new Date())
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);

  // Helper functions
  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    editForm.reset({
      attendeeType: meeting.attendeeType || "other",
      investorId: meeting.investorId || null,
      analystId: meeting.analystId || null,
      title: meeting.title,
      description: meeting.description || "",
      scheduledDate: new Date(meeting.scheduledDate),
      status: meeting.status,
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
          <h1 className="text-3xl font-bold tracking-tight">Meeting Scheduler / 미팅 스케줄러</h1>
          <p className="text-muted-foreground">
            Schedule meetings with investors using our interactive calendar / 대화형 캘린더로 투자자와 미팅을 예약하세요
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="scheduler">Calendar Scheduler / 캘린더 스케줄러</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Meetings / 예정된 미팅</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduler" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Book / 빠른 예약</CardTitle>
                  <CardDescription>
                    Pre-select an investor to speed up booking / 투자자를 미리 선택하여 예약 속도를 높이세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Select Investor / 투자자 선택
                      </label>
                      <Select onValueChange={(value) => {
                        const investor = investors.find(inv => inv.id.toString() === value);
                        setSelectedInvestor(investor);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose investor / 투자자 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {investors.map((investor) => (
                            <SelectItem key={investor.id} value={investor.id.toString()}>
                              <div className="flex flex-col">
                                <span>{investor.name}</span>
                                <span className="text-sm text-muted-foreground">{investor.company}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedInvestor && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="font-medium text-sm">Selected Investor / 선택된 투자자</h4>
                        <p className="text-sm text-gray-600">{selectedInvestor.name}</p>
                        <p className="text-xs text-gray-500">{selectedInvestor.company}</p>
                        <p className="text-xs text-gray-500">{selectedInvestor.email}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Meeting Statistics / 미팅 통계</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-gray-50 p-2 rounded text-center">
                          <div className="font-medium">{meetings.length}</div>
                          <div className="text-xs text-gray-500">Total / 총계</div>
                        </div>
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <div className="font-medium">{upcomingMeetings.length}</div>
                          <div className="text-xs text-gray-500">Upcoming / 예정</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <CalendarScheduler selectedInvestor={selectedInvestor} />
            </div>
          </div>
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
                            <h4 className="font-medium">{meeting.title}</h4>
                            <div className="flex items-center text-sm text-gray-600 space-x-4">
                              <span className="flex items-center">
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
                            {meeting.description && (
                              <p className="text-sm text-gray-500 mt-1">{meeting.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(meeting.status)}`}>
                            {meeting.status}
                          </span>
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
    </div>
  );
}