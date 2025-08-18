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
import { Plus, Search, Eye, Edit, Trash2, Calendar, Users, Clock, MoreVertical, CheckCircle, Upload, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Meeting, Investor, Analyst } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { useToast } from "@/hooks/use-toast";

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
  const [uploadingMinutes, setUploadingMinutes] = useState(false);
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Meeting minutes upload mutation
  const uploadMinutesMutation = useMutation({
    mutationFn: ({ meetingId, minutesFileURL, minutesFileName, minutesFileSize }: {
      meetingId: number;
      minutesFileURL: string;
      minutesFileName: string;
      minutesFileSize?: number;
    }) => 
      apiRequest(`/api/meetings/${meetingId}/minutes`, "PUT", { 
        minutesFileURL, 
        minutesFileName, 
        minutesFileSize 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/upcoming"] });
      toast({
        title: "Success / 성공",
        description: "Meeting minutes uploaded successfully / 회의록이 성공적으로 업로드되었습니다"
      });
      setUploadingMinutes(false);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed / 업로드 실패",
        description: "Failed to upload meeting minutes / 회의록 업로드에 실패했습니다",
        variant: "destructive"
      });
      setUploadingMinutes(false);
    }
  });

  // Function to set up edit form when meeting is selected
  const handleEditMeeting = (meeting: Meeting) => {
    const meetingDate = new Date(meeting.scheduledDate);
    const dateString = meetingDate.toISOString().split('T')[0];
    const timeString = meetingDate.toTimeString().split(' ')[0].substring(0, 5);
    
    editForm.reset({
      title: meeting.title,
      description: meeting.description || "",
      attendeeType: meeting.attendeeType as "investor" | "analyst" | "other",
      investorId: meeting.investorId,
      analystId: meeting.analystId,
      scheduledDate: dateString,
      scheduledTime: timeString,
      status: meeting.status as "scheduled" | "completed" | "cancelled"
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

  // Meeting minutes upload handlers
  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("/api/objects/upload", "POST", {});
      return {
        method: "PUT" as const,
        url: response.uploadURL,
      };
    } catch (error) {
      toast({
        title: "Upload Error / 업로드 오류",
        description: "Failed to get upload URL / 업로드 URL 가져오기 실패",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleMinutesUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (!editingMeeting) return;
    
    setUploadingMinutes(true);
    
    if (result.successful && result.successful[0]) {
      const file = result.successful[0];
      const uploadURL = file.uploadURL;
      const fileName = file.name;
      const fileSize = file.size;
      
      uploadMinutesMutation.mutate({
        meetingId: editingMeeting.id,
        minutesFileURL: uploadURL,
        minutesFileName: fileName,
        minutesFileSize: fileSize
      });
    } else {
      toast({
        title: "Upload Failed / 업로드 실패",
        description: "File upload was not successful / 파일 업로드가 성공하지 못했습니다",
        variant: "destructive"
      });
      setUploadingMinutes(false);
    }
  };

  const handleDownloadMinutes = async (meetingId: number) => {
    try {
      const response = await apiRequest(`/api/meetings/${meetingId}/minutes`, "GET");
      if (response.downloadUrl) {
        // Create a link and trigger download
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.download = response.fileName || 'meeting-minutes';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      toast({
        title: "Download Failed / 다운로드 실패",
        description: "Failed to download meeting minutes / 회의록 다운로드에 실패했습니다",
        variant: "destructive"
      });
    }
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
                
                {/* Meeting Minutes Section in View Dialog */}
                {viewingMeeting.minutesFilePath && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <h4 className="text-sm font-medium text-gray-600">Meeting Minutes / 회의록</h4>
                      </div>
                    </div>
                    <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">{viewingMeeting.minutesFileName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {viewingMeeting.minutesUploadedAt && 
                              `Uploaded: ${format(new Date(viewingMeeting.minutesUploadedAt), "yyyy-MM-dd HH:mm")}`
                            }
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadMinutes(viewingMeeting.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download / 다운로드
                          </Button>
                        </div>
                      </div>
                    </div>
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
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title / 제목</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Meeting title" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status / 상태</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled / 예정</SelectItem>
                            <SelectItem value="completed">Completed / 완료</SelectItem>
                            <SelectItem value="cancelled">Cancelled / 취소</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date / 날짜</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="scheduledTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time / 시간</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="attendeeType"
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
                          <SelectItem value="investor">Investor / 투자자</SelectItem>
                          <SelectItem value="analyst">Analyst / 애널리스트</SelectItem>
                          <SelectItem value="other">Other / 기타</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {editForm.watch("attendeeType") === "investor" && (
                  <FormField
                    control={editForm.control}
                    name="investorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Investor / 투자자 선택</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose investor" />
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

                {editForm.watch("attendeeType") === "analyst" && (
                  <FormField
                    control={editForm.control}
                    name="analystId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Analyst / 애널리스트 선택</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose analyst" />
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

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description / 설명</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Meeting description" rows={3} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Existing minutes file display */}
                {editingMeeting.minutesFilePath && (
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <h3 className="text-sm font-medium">Current Meeting Minutes / 현재 회의록</h3>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">{editingMeeting.minutesFileName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {editingMeeting.minutesUploadedAt && 
                              `Uploaded: ${format(new Date(editingMeeting.minutesUploadedAt), "yyyy-MM-dd HH:mm")}`
                            }
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadMinutes(editingMeeting.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download / 다운로드
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center space-x-2 mt-6">
                  <div className="flex space-x-2">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleMinutesUploadComplete}
                      buttonClassName="bg-black text-white hover:bg-gray-800"
                    >
                      <div className="flex items-center space-x-2">
                        <Upload className="h-4 w-4" />
                        <span>회의록 UPLOAD</span>
                      </div>
                    </ObjectUploader>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button type="button" variant="outline" onClick={() => setEditingMeeting(null)}>
                      Cancel / 취소
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save Changes / 변경사항 저장"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}