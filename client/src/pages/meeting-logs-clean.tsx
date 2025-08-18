import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Eye, Edit, Trash2, Calendar, Users, Clock, MoreVertical, CheckCircle, Upload, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Meeting, Investor, Analyst } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { useToast } from "@/hooks/use-toast";

export default function Meetings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [uploadingMinutes, setUploadingMinutes] = useState(false);
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Meeting minutes upload handlers for ObjectUploader in edit dialog
  const handleGetMinutesUploadParameters = async () => {
    try {
      setUploadingMinutes(true);
      const response = await fetch("/api/objects/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error("Failed to get upload URL");
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      setUploadingMinutes(false);
      console.error("Failed to get upload URL:", error);
      throw error;
    }
  };

  const handleMinutesUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (!editingMeeting) {
      setUploadingMinutes(false);
      return;
    }

    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      
      try {
        const response = await fetch(`/api/meetings/${editingMeeting.id}/minutes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uploadURL: uploadedFile.uploadURL,
            fileName: uploadedFile.name,
            fileSize: uploadedFile.size,
          })
        });
        
        if (!response.ok) throw new Error("Failed to save meeting minutes");

        queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/meetings/upcoming"] });
        
        toast({
          title: "Success / 성공",
          description: "Meeting minutes uploaded successfully / 회의록이 성공적으로 업로드되었습니다"
        });
        
        setUploadingMinutes(false);
        setEditingMeeting(null); // Close the dialog after successful upload
      } catch (error) {
        console.error("Failed to save meeting minutes:", error);
        toast({
          title: "Upload Failed / 업로드 실패",
          description: "Failed to save meeting minutes / 회의록 저장에 실패했습니다",
          variant: "destructive"
        });
        setUploadingMinutes(false);
      }
    }
  };

  // Handle meeting minutes download
  const handleDownloadMinutes = (meetingId: number) => {
    const meeting = allMeetings.find(m => m.id === meetingId);
    if (meeting?.minutesFilePath) {
      window.open(`/objects/${meeting.minutesFilePath}`, '_blank');
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

                        {/* Meeting Minutes Status */}
                        {meeting.minutesFilePath && (
                          <div className="mt-2 flex items-center text-sm text-green-600">
                            <FileText className="mr-1 h-4 w-4" />
                            <span>Meeting minutes available / 회의록 있음</span>
                          </div>
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
                          <DropdownMenuItem onClick={() => setEditingMeeting(meeting)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit / 편집
                          </DropdownMenuItem>
                          {meeting.minutesFilePath && (
                            <DropdownMenuItem
                              onClick={() => handleDownloadMinutes(meeting.id)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download Minutes / 회의록 다운로드
                            </DropdownMenuItem>
                          )}
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
            <p className="text-gray-600 mt-1">Manage your meetings and upload meeting minutes / 미팅 관리 및 회의록 업로드</p>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <h4 className="text-sm font-medium text-gray-600">Meeting Minutes / 회의록</h4>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMeeting(viewingMeeting)}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Upload / 업로드
                      </Button>
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

      {/* Edit Meeting Dialog with Upload Functionality */}
      <Dialog open={!!editingMeeting} onOpenChange={() => {
        setEditingMeeting(null);
        setUploadingMinutes(false);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Meeting / 미팅 편집</DialogTitle>
          </DialogHeader>
          {editingMeeting && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">{editingMeeting.title}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Date & Time / 날짜 및 시간</p>
                    <p className="text-sm">{format(new Date(editingMeeting.scheduledDate), "yyyy-MM-dd HH:mm")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Attendee / 참석자</p>
                    <p className="text-sm">{getAttendeeName(editingMeeting)}</p>
                    <p className="text-xs text-gray-500">{getAttendeeCompany(editingMeeting)}</p>
                  </div>
                </div>
                
                {/* Meeting Minutes Section in Edit Dialog */}
                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <h4 className="text-lg font-medium text-gray-900">Meeting Minutes / 회의록</h4>
                    </div>
                  </div>
                  
                  {editingMeeting.minutesFilePath ? (
                    <div className="bg-gray-50 p-4 rounded-lg">
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
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-4">No meeting minutes uploaded yet / 회의록이 아직 업로드되지 않았습니다</p>
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={10485760} // 10MB
                          onGetUploadParameters={handleGetMinutesUploadParameters}
                          onComplete={handleMinutesUploadComplete}
                          buttonClassName="w-auto"
                        >
                          <div className="flex items-center space-x-2">
                            <Upload className="h-4 w-4" />
                            <span>{uploadingMinutes ? "Uploading... / 업로드 중..." : "Upload Minutes / 회의록 업로드"}</span>
                          </div>
                        </ObjectUploader>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingMeeting(null);
                    setUploadingMinutes(false);
                  }}
                  disabled={uploadingMinutes}
                >
                  Close / 닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}