import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Eye, Edit, Trash2, Calendar, Users, Clock, MoreVertical, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Meeting, Investor, Analyst } from "@shared/schema";

// Edit meeting form schema
const editMeetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  attendeeType: z.enum(["investor", "analyst", "other"]),
  investorId: z.number().nullable(),
  analystId: z.number().nullable(),
  scheduledDate: z.string(),
  scheduledTime: z.string(),
  status: z.enum(["scheduled", "completed", "cancelled"])
});

type EditMeetingForm = z.infer<typeof editMeetingSchema>;

export default function Meetings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [location] = useLocation();
  const queryClient = useQueryClient();

  // Edit form setup
  const editForm = useForm<EditMeetingForm>({
    resolver: zodResolver(editMeetingSchema),
    defaultValues: {
      title: "",
      description: "",
      attendeeType: "investor",
      investorId: null,
      analystId: null,
      scheduledDate: "",
      scheduledTime: "",
      status: "scheduled"
    }
  });

  // Check URL parameters to set default tab
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const tab = params.get('tab');
    if (tab === 'completed') {
      setActiveTab('completed');
    }
  }, [location]);

  const { data: allMeetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: upcomingMeetings = [], isLoading: upcomingLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings/upcoming"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  // Filter completed meetings
  const now = new Date();
  const completedMeetings = allMeetings.filter(meeting => 
    new Date(meeting.scheduledDate) < now
  ).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/meetings/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete meeting");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
    },
  });

  // Update meeting mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditMeetingForm }) => 
      apiRequest(`/api/meetings/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/upcoming"] });
      setEditingMeeting(null);
      editForm.reset();
    },
  });

  // Function to set up edit form when meeting is selected
  const handleEditMeeting = (meeting: Meeting) => {
    const meetingDate = new Date(meeting.scheduledDate);
    const dateString = meetingDate.toISOString().split('T')[0];
    const timeString = meetingDate.toTimeString().split(' ')[0].substring(0, 5);
    
    editForm.reset({
      title: meeting.title,
      description: meeting.description || "",
      attendeeType: meeting.attendeeType,
      investorId: meeting.investorId,
      analystId: meeting.analystId,
      scheduledDate: dateString,
      scheduledTime: timeString,
      status: meeting.status
    });
    
    setEditingMeeting(meeting);
  };

  // Function to handle form submission
  const onEditSubmit = (data: EditMeetingForm) => {
    if (!editingMeeting) return;
    
    // Combine date and time
    const scheduledDate = new Date(`${data.scheduledDate}T${data.scheduledTime}:00`);
    
    const updateData = {
      ...data,
      scheduledDate: scheduledDate.toISOString(),
      investorId: data.attendeeType === "investor" ? data.investorId : null,
      analystId: data.attendeeType === "analyst" ? data.analystId : null,
    };
    
    updateMutation.mutate({ id: editingMeeting.id, data: updateData });
  };

  const getAttendeeName = (meeting: Meeting) => {
    if (meeting.investorId) {
      const investor = investors.find(inv => inv.id === meeting.investorId);
      return investor ? investor.name : "Unknown Investor";
    }
    if (meeting.analystId) {
      const analyst = analysts.find(ana => ana.id === meeting.analystId);
      return analyst ? analyst.name : "Unknown Analyst";
    }
    return "Other / 기타";
  };

  const getAttendeeCompany = (meeting: Meeting) => {
    if (meeting.investorId) {
      const investor = investors.find(inv => inv.id === meeting.investorId);
      return investor ? investor.company : "";
    }
    if (meeting.analystId) {
      const analyst = analysts.find(ana => ana.id === meeting.analystId);
      return analyst ? analyst.company : "";
    }
    return "";
  };

  const getAttendeeType = (meeting: Meeting) => {
    if (meeting.attendeeType === "investor") return "Investor / 투자자";
    if (meeting.attendeeType === "analyst") return "Analyst / 애널리스트";
    return "Other / 기타";
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filterMeetings = (meetings: Meeting[]) => {
    if (searchQuery === "") return meetings;
    
    return meetings.filter(meeting => {
      const attendeeName = getAttendeeName(meeting);
      const attendeeCompany = getAttendeeCompany(meeting);
      
      return meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             attendeeCompany.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const renderMeetingList = (meetings: Meeting[], loading: boolean, emptyMessage: string) => {
    const filteredMeetings = filterMeetings(meetings);

    if (loading) {
      return <div className="p-6 text-center">Loading meetings...</div>;
    }
    
    if (filteredMeetings.length === 0) {
      return <div className="p-6 text-center text-gray-500">{emptyMessage}</div>;
    }
    
    return (
      <div className="space-y-4">
        {filteredMeetings.map((meeting: Meeting) => {
          const meetingDate = new Date(meeting.scheduledDate);
          const dayMonth = format(meetingDate, "MMM\ndd");
          const time = format(meetingDate, "HH:mm");
          
          return (
            <Card key={meeting.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Date Column */}
                  <div className="flex-shrink-0 text-center bg-blue-50 rounded-lg p-3 min-w-[80px]">
                    <div className="text-sm font-medium text-blue-600 whitespace-pre-line">
                      {dayMonth}
                    </div>
                  </div>
                  
                  {/* Meeting Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {meeting.title}
                        </h3>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            <Users className="mr-1 h-3 w-3" />
                            {getAttendeeName(meeting)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="mr-1 h-3 w-3" />
                            {time}
                          </Badge>
                          <Badge className={getStatusBadgeColor(meeting.status)}>
                            {meeting.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {getAttendeeCompany(meeting)} • {getAttendeeType(meeting)}
                        </p>
                        
                        {meeting.description && (
                          <p className="text-sm text-gray-700">
                            {meeting.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setViewingMeeting(meeting)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details / 상세보기
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditMeeting(meeting)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Meeting / 수정
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(meeting.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Meeting / 삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="mr-3 h-6 w-6" />
              Meetings / 미팅
            </h2>
            <p className="text-gray-600 mt-1">Manage your meetings and schedule new ones / 미팅 관리 및 새 일정 예약</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search meetings by title, attendee, or company / 제목, 참석자, 회사로 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Upcoming / 예정</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Completed / 완료</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-6">
          {renderMeetingList(
            upcomingMeetings,
            upcomingLoading,
            "No upcoming meetings found. Schedule your first meeting to get started. / 예정된 미팅이 없습니다. 첫 미팅을 예약해보세요."
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="mt-6">
          {renderMeetingList(
            completedMeetings,
            isLoading,
            "No completed meetings found. / 완료된 미팅이 없습니다."
          )}
        </TabsContent>
      </Tabs>

      {/* View Meeting Dialog */}
      <Dialog open={!!viewingMeeting} onOpenChange={() => setViewingMeeting(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Meeting Details / 미팅 상세정보</DialogTitle>
          </DialogHeader>
          {viewingMeeting && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">{viewingMeeting.title}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Date & Time / 날짜 및 시간</p>
                    <p className="text-sm">{format(new Date(viewingMeeting.scheduledDate), "yyyy-MM-dd HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Attendee / 참석자</p>
                    <p className="text-sm">{getAttendeeName(viewingMeeting)}</p>
                    <p className="text-xs text-gray-500">{getAttendeeCompany(viewingMeeting)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Type / 유형</p>
                    <p className="text-sm">{getAttendeeType(viewingMeeting)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status / 상태</p>
                    <Badge className={getStatusBadgeColor(viewingMeeting.status)}>
                      {viewingMeeting.status}
                    </Badge>
                  </div>
                </div>
                {viewingMeeting.description && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Description / 설명</p>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                      {viewingMeeting.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Meeting Dialog */}
      <Dialog open={!!editingMeeting} onOpenChange={() => setEditingMeeting(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Meeting / 미팅 수정</DialogTitle>
          </DialogHeader>
          {editingMeeting && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Meeting editing functionality will be implemented here.
                <br />
                미팅 수정 기능이 여기에 구현될 예정입니다.
              </p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingMeeting(null)}>
                  Cancel / 취소
                </Button>
                <Button onClick={() => setEditingMeeting(null)}>
                  Save Changes / 변경사항 저장
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}