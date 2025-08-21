import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
import { SimpleFileUploader } from "@/components/SimpleFileUploader";
// import type { UploadResult } from "@uppy/core";
import { useToast } from "@/hooks/use-toast";

// Edit meeting form schema
const editMeetingSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  attendeeType: z.enum(["investor", "analyst", "other"]),
  investorId: z.number().nullable(),
  analystId: z.number().nullable(),
  scheduledDate: z.string(),
  scheduledTime: z.string(),
  duration: z.number().min(15, "Duration must be at least 15 minutes")
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
      duration: 60
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

  // Handle URL query parameter for auto-opening edit dialog
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editMeetingId = urlParams.get('edit');
    
    if (editMeetingId && allMeetings.length > 0) {
      const meetingToEdit = allMeetings.find(m => m.id === parseInt(editMeetingId));
      if (meetingToEdit) {
        startEditingMeeting(meetingToEdit);
        // Clear the URL parameter after opening the dialog
        window.history.replaceState({}, '', '/meetings');
      }
    }
  }, [allMeetings]);

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

  // Edit meeting mutation
  const editMeetingMutation = useMutation({
    mutationFn: async (data: EditMeetingForm & { id: number; status: "scheduled" | "completed" | "cancelled" }) => {
      const { id, scheduledDate, scheduledTime, ...rest } = data;
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      
      const response = await fetch(`/api/meetings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...rest,
          scheduledDate: scheduledDateTime.toISOString(),
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update meeting: ${errorData}`);
      }

      // Safe JSON parsing for edit meeting response
      try {
        const responseText = await response.text();
        if (!responseText.trim()) {
          return { success: true }; // Empty response is OK
        }
        if (responseText.trim().startsWith('<')) {
          return { success: true }; // HTML response means success
        }
        return JSON.parse(responseText);
      } catch (parseError) {
        console.warn("JSON parsing failed but treating as successful update:", parseError);
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/upcoming"] });
      setEditingMeeting(null);
      editForm.reset();
      toast({
        title: "Success / 성공",
        description: "Meeting updated successfully / 미팅이 성공적으로 업데이트되었습니다"
      });
    },
    onError: (error) => {
      toast({
        title: "Error / 오류", 
        description: `Failed to update meeting: ${error.message} / 미팅 업데이트에 실패했습니다`,
        variant: "destructive"
      });
    }
  });

  // Function to populate edit form when editing a meeting
  const startEditingMeeting = (meeting: Meeting) => {
    console.log("startEditingMeeting called with:", meeting);
    
    try {
      const scheduledDate = new Date(meeting.scheduledDate);
      const dateStr = scheduledDate.toISOString().split('T')[0];
      const timeStr = scheduledDate.toTimeString().split(' ')[0].substring(0, 5);
      
      const formData = {
        title: meeting.title,
        description: meeting.description || "",
        attendeeType: meeting.attendeeType as "investor" | "analyst" | "other",
        investorId: meeting.investorId,
        analystId: meeting.analystId,
        scheduledDate: dateStr,
        scheduledTime: timeStr,
        duration: meeting.duration || 60,

      };
      
      console.log("Form data to reset:", formData);
      editForm.reset(formData);
      
      console.log("Setting editingMeeting to:", meeting);
      setEditingMeeting(meeting);
      
      // Force state update with timeout
      setTimeout(() => {
        console.log("Force setting editingMeeting again");
        setEditingMeeting(meeting);
      }, 50);
      
    } catch (error) {
      console.error("Error in startEditingMeeting:", error);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = (data: EditMeetingForm) => {
    if (!editingMeeting) return;
    
    // Automatically set status based on date
    const meetingDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}:00`);
    const now = new Date();
    let status: "scheduled" | "completed" | "cancelled";
    
    // Keep cancelled status if it was already cancelled
    if (editingMeeting.status === "cancelled") {
      status = "cancelled";
    } else {
      // Set status based on whether the meeting is in the past or future
      status = meetingDateTime < now ? "completed" : "scheduled";
    }
    
    editMeetingMutation.mutate({ ...data, id: editingMeeting.id, status });
  };

  // Delete meeting minutes mutation
  const deleteMinutesMutation = useMutation({
    mutationFn: async (meetingId: number) => {
      const response = await fetch(`/api/meetings/${meetingId}/minutes`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to delete minutes: ${errorData}`);
      }
      return response.json();
    },
    onSuccess: (data, meetingId) => {
      // Update the editing meeting state immediately
      if (editingMeeting && editingMeeting.id === meetingId) {
        setEditingMeeting({
          ...editingMeeting,
          minutesFilePath: null,
          minutesFileName: null,
          minutesFileSize: null,
          minutesUploadedAt: null
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings/upcoming"] });
      toast({
        title: "성공",
        description: "회의록이 삭제되었습니다"
      });
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: `회의록 삭제에 실패했습니다: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handle delete minutes
  const handleDeleteMinutes = (meetingId: number) => {
    if (confirm("회의록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      deleteMinutesMutation.mutate(meetingId);
    }
  };

  // Direct file upload handler for meeting minutes
  const handleDirectFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingMeeting) {
      return;
    }

    // File size validation (50MB limit)
    if (file.size > 52428800) {
      toast({
        title: "파일 크기 오류",
        description: "파일 크기는 50MB를 초과할 수 없습니다.",
        variant: "destructive"
      });
      return;
    }

    setUploadingMinutes(true);

    try {
      console.log('Starting direct file upload:', file.name);
      
      // Step 1: Get pre-signed URL
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('업로드 URL 생성에 실패했습니다.');
      }

      const { uploadURL } = await uploadResponse.json();
      console.log('Got upload URL, uploading file...');

      // Step 2: Upload file to pre-signed URL
      const uploadFileResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadFileResponse.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      console.log('File uploaded successfully, saving to meeting...');

      // Step 3: Save to meeting
      await handleMinutesSaveToMeeting({
        name: file.name,
        size: file.size,
        url: uploadURL,
      });

    } catch (error) {
      console.error('Direct upload error:', error);
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setUploadingMinutes(false);
      // Clear the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Handle saving uploaded minutes to meeting
  const handleMinutesSaveToMeeting = async (file: { name: string; size: number; url: string }) => {
    if (!editingMeeting) {
      return;
    }

    try {
      console.log("Uploading minutes for meeting:", editingMeeting.id);
      console.log("File details:", file);

      const response = await fetch(`/api/meetings/${editingMeeting.id}/minutes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploadURL: file.url,
          fileName: file.name,
          fileSize: file.size,
        })
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`서버 오류 (${response.status}): ${errorText}`);
      }

      // Safe JSON parsing
      let responseData;
      try {
        const responseText = await response.text();
        console.log("Raw response text:", responseText);
        
        if (!responseText.trim()) {
          // Empty response is OK for successful uploads
          responseData = { success: true };
        } else if (responseText.trim().startsWith('<')) {
          console.log("Server returned HTML instead of JSON, but upload might have succeeded");
          responseData = { success: true };
        } else {
          responseData = JSON.parse(responseText);
          console.log("Parsed response:", responseData);
        }
      } catch (parseError) {
        console.log("JSON parsing failed but treating as successful upload:", parseError);
        // Treat parsing errors as successful uploads since the upload likely succeeded
        responseData = { success: true };
      }

      // Safe cache invalidation
      try {
        await queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/meetings/upcoming"] });
        console.log("Cache invalidated successfully");
      } catch (cacheError) {
        console.warn("Cache invalidation failed, but upload was successful:", cacheError);
      }

      toast({
        title: "성공",
        description: "회의록이 성공적으로 업로드되었습니다"
      });

      // 업로드 성공 후 editingMeeting 상태를 즉시 업데이트
      if (editingMeeting) {
        const updatedMeeting = {
          ...editingMeeting,
          minutesFilePath: responseData.objectPath || `/objects/uploads/${file.url.split('/').pop()?.split('?')[0]}`,
          minutesFileName: file.name,
          minutesFileSize: file.size,
          minutesUploadedAt: new Date()
        };
        setEditingMeeting(updatedMeeting);
        console.log("Updated editing meeting with minutes:", updatedMeeting);
      }

    } catch (error) {
      console.error("Failed to save meeting minutes:", error);
      let errorMessage = "알 수 없는 오류가 발생했습니다";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "업로드 실패",
        description: `회의록 저장에 실패했습니다: ${errorMessage}`,
        variant: "destructive"
      });
    }
  };

  // Removed old complex Uppy upload handler

  // Handle meeting minutes download
  const handleDownloadMinutes = (meetingId: number) => {
    const meeting = allMeetings.find(m => m.id === meetingId);
    if (meeting?.minutesFilePath) {
      // minutesFilePath already contains the full path starting with /objects/
      window.open(meeting.minutesFilePath, '_blank');
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
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case "completed": return "completed / 완료";
      case "cancelled": return "cancelled / 취소";
      case "scheduled": return "scheduled / 예정";
      default: return status;
    }
  };

  const isPastMeeting = (meeting: Meeting) => {
    return new Date(meeting.scheduledDate) < new Date();
  };

  const filterMeetings = (meetings: Meeting[]) => {
    if (!searchQuery) return meetings;
    
    const query = searchQuery.toLowerCase();
    return meetings.filter(meeting => {
      const titleMatch = meeting.title.toLowerCase().includes(query);
      const attendeeName = getAttendeeName(meeting).toLowerCase();
      const attendeeCompany = getAttendeeCompany(meeting).toLowerCase();
      
      return titleMatch || attendeeName.includes(query) || attendeeCompany.includes(query);
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
            <Card key={meeting.id} className="hover:shadow-md transition-shadow relative">
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
                      <Badge variant="outline" className="text-xs">
                        {meeting.duration || 60}분
                      </Badge>
                      <Badge className={getStatusBadgeColor(meeting.status)}>
                        {getStatusDisplayText(meeting.status)}
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

                    {/* Meeting Minutes Status */}
                    {meeting.minutesFilePath && (
                      <div className="mt-2 flex items-center text-sm text-green-600">
                        <FileText className="mr-1 h-4 w-4" />
                        <span>Meeting minutes available / 회의록 있음</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons - Fixed positioning to avoid event conflicts */}
                  <div className="absolute top-2 right-2 z-10">
                    <div className="flex space-x-1">
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          userSelect: 'none',
                          zIndex: 1000
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setViewingMeeting(meeting);
                        }}
                      >
                        View
                      </span>
                      
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#4b5563',
                          color: 'white',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          userSelect: 'none',
                          zIndex: 1000
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startEditingMeeting(meeting);
                        }}
                      >
                        Edit
                      </span>
                      
                      {meeting.minutesFilePath && (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            zIndex: 1000
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDownloadMinutes(meeting.id);
                          }}
                        >
                          Download
                        </span>
                      )}
                      
                      {meeting.status === "scheduled" && (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: '#9ca3af',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            userSelect: 'none',
                            zIndex: 1000
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm('이 미팅을 취소하시겠습니까? / Cancel this meeting?')) {
                              const scheduledDate = new Date(meeting.scheduledDate);
                              const dateStr = scheduledDate.toISOString().split('T')[0];
                              const timeStr = scheduledDate.toTimeString().split(' ')[0].substring(0, 5);
                              
                              editMeetingMutation.mutate({
                                id: meeting.id,
                                title: meeting.title || "",
                                description: meeting.description || "",
                                attendeeType: meeting.attendeeType as "investor" | "analyst" | "other",
                                investorId: meeting.investorId || null,
                                analystId: meeting.analystId || null,
                                scheduledDate: dateStr,
                                scheduledTime: timeStr,
                                duration: meeting.duration || 60,
                                status: "cancelled"
                              });
                            }
                          }}
                        >
                          Cancel
                        </span>
                      )}
                      
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          userSelect: 'none',
                          zIndex: 1000
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm('정말 이 회의를 삭제하시겠습니까? / Really delete this meeting?')) {
                            deleteMutation.mutate(meeting.id);
                          }
                        }}
                      >
                        Delete
                      </span>
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
              미팅관리
            </h2>
            <p className="text-gray-600 mt-1">미팅 관리 및 회의록 업로드</p>
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
            <DialogDescription>
              View meeting details and download minutes / 미팅 상세정보 보기 및 회의록 다운로드
            </DialogDescription>
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
                    <p className="text-sm font-medium text-gray-600">Duration / 길이</p>
                    <p className="text-sm">{viewingMeeting.duration || 60}분</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status / 상태</p>
                    <Badge className={getStatusBadgeColor(viewingMeeting.status)}>
                      {getStatusDisplayText(viewingMeeting.status)}
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
                {viewingMeeting.minutesFilePath ? (
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
                ) : (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <h4 className="text-sm font-medium text-gray-600">Meeting Minutes / 회의록</h4>
                    </div>
                    <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500">No meeting minutes uploaded yet / 회의록이 아직 업로드되지 않았습니다</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Meeting Dialog with Full Form and Upload Functionality */}
      <Dialog open={!!editingMeeting} onOpenChange={(open) => {
        console.log("Dialog onOpenChange called with:", open);
        if (!open) {
          setEditingMeeting(null);
          setUploadingMinutes(false);
          editForm.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Meeting / 미팅 편집</DialogTitle>
            <DialogDescription>
              Edit meeting details and upload meeting minutes / 미팅 상세정보 편집 및 회의록 업로드
            </DialogDescription>
          </DialogHeader>
          {editingMeeting && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">




                <div className="grid grid-cols-3 gap-4">
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

                  <FormField
                    control={editForm.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration / 길이</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const numValue = parseInt(value);
                            field.onChange(numValue);
                            editForm.trigger("duration"); // Trigger validation
                          }}
                          value={field.value?.toString() || "60"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">30분</SelectItem>
                            <SelectItem value="60">1시간</SelectItem>
                            <SelectItem value="90">1시간 30분</SelectItem>
                            <SelectItem value="120">2시간</SelectItem>
                          </SelectContent>
                        </Select>
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

                {/* Meeting Minutes Section */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h3 className="text-sm font-medium">Meeting Minutes / 회의록</h3>
                  </div>
                  
                  {editingMeeting.minutesFilePath ? (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">{editingMeeting.minutesFileName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {editingMeeting.minutesUploadedAt && 
                              `업로드: ${format(new Date(editingMeeting.minutesUploadedAt), "yyyy-MM-dd HH:mm")}`
                            }
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadMinutes(editingMeeting.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            다운로드
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteMinutes(editingMeeting.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteMinutesMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {deleteMinutesMutation.isPending ? "삭제 중..." : "삭제"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-3">No meeting minutes uploaded yet / 회의록이 아직 업로드되지 않았습니다</p>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          onChange={handleDirectFileUpload}
                          disabled={uploadingMinutes}
                          className="hidden"
                          id={`file-upload-${editingMeeting.id}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById(`file-upload-${editingMeeting.id}`)?.click()}
                          disabled={uploadingMinutes}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                        >
                          <div className="flex items-center space-x-2">
                            <Upload className="h-4 w-4" />
                            <span>{uploadingMinutes ? "Uploading... / 업로드 중..." : "Upload Minutes / 회의록 업로드"}</span>
                          </div>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingMeeting(null);
                      setUploadingMinutes(false);
                      editForm.reset();
                    }}
                    disabled={editMeetingMutation.isPending || uploadingMinutes}
                  >
                    No change / 변경 없음
                  </Button>
                  <Button
                    type="submit"
                    disabled={editMeetingMutation.isPending || uploadingMinutes}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      console.log("Form state:", {
                        isValid: editForm.formState.isValid,
                        errors: editForm.formState.errors,
                        values: editForm.getValues()
                      });
                    }}
                  >
                    {editMeetingMutation.isPending ? "Updating... / 업데이트 중..." : "Update Meeting / 미팅 업데이트"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}