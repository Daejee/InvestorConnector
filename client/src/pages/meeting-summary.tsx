import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, FileText, Calendar, Users, Edit, Upload } from "lucide-react";
import { format } from "date-fns";
import { insertMeetingSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Meeting, Investor, Analyst, Document } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

export default function MeetingSummary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: allMeetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const form = useForm<any>({
    resolver: zodResolver(insertMeetingSchema),
    defaultValues: {
      attendeeType: "investor",
      investorId: null,
      analystId: null,
      title: "",
      description: "",
      scheduledDate: new Date(),
      status: "scheduled",
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/meetings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({
        title: "Meeting updated / 미팅이 업데이트되었습니다",
        description: "The meeting has been successfully updated / 미팅이 성공적으로 업데이트되었습니다",
      });
      setIsEditOpen(false);
      setSelectedMeeting(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error / 오류",
        description: error.message || "Failed to update meeting / 미팅 업데이트에 실패했습니다",
        variant: "destructive",
      });
    },
  });

  // Document upload handlers
  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload", {});
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      throw error;
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    setIsUploading(false);
    
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      
      try {
        await apiRequest("POST", "/api/documents/upload", {
          uploadURL: uploadedFile.uploadURL,
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,
          fileType: uploadedFile.type,
          category: "Meeting Document",
          description: `Uploaded for meeting summary`,
          uploadedBy: "User",
          tags: "meeting",
        });

        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        
        toast({
          title: "Document uploaded / 문서가 업로드되었습니다",
          description: "The document has been successfully uploaded / 문서가 성공적으로 업로드되었습니다",
        });
      } catch (error) {
        console.error("Failed to save document:", error);
        toast({
          title: "Upload failed / 업로드 실패",
          description: "Failed to save document information / 문서 정보 저장에 실패했습니다",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    form.reset({
      attendeeType: meeting.attendeeType,
      investorId: meeting.investorId,
      analystId: meeting.analystId,
      title: meeting.title,
      description: meeting.description,
      scheduledDate: new Date(meeting.scheduledDate),
      status: meeting.status,
    });
    setIsEditOpen(true);
  };

  const onSubmit = (data: any) => {
    if (!selectedMeeting) return;
    
    updateMeetingMutation.mutate({
      id: selectedMeeting.id,
      data: {
        ...data,
        scheduledDate: new Date(data.scheduledDate),
      },
    });
  };

  const getAttendeeName = (meeting: Meeting) => {
    if (meeting.attendeeType === "investor") {
      const investor = investors.find(i => i.id === meeting.investorId);
      return investor ? `${investor.name} - ${investor.company}` : "Unknown Investor";
    } else if (meeting.attendeeType === "analyst") {
      const analyst = analysts.find(a => a.id === meeting.analystId);
      return analyst ? `${analyst.name} - ${analyst.company}` : "Unknown Analyst";
    }
    return "Other";
  };

  const getAttendeeType = (meeting: Meeting) => {
    switch (meeting.attendeeType) {
      case "investor": return "Investor / 투자자";
      case "analyst": return "Analyst / 애널리스트";
      default: return "Other / 기타";
    }
  };

  const filteredMeetings = allMeetings.filter((meeting) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const attendeeName = getAttendeeName(meeting).toLowerCase();
    
    return (
      meeting.title?.toLowerCase().includes(searchLower) ||
      meeting.description?.toLowerCase().includes(searchLower) ||
      attendeeName.includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meeting Summary / 미팅요약</h1>
        <p className="text-gray-600">Complete history of concluded meetings / 완료된 미팅 기록</p>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search meetings... / 미팅 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ObjectUploader
            maxNumberOfFiles={5}
            maxFileSize={50485760} // 50MB
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleUploadComplete}
            buttonClassName="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents / 문서 업로드
          </ObjectUploader>
        </div>
      </div>

      {/* Uploaded Documents Section */}
      {documents.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Uploaded Documents / 업로드된 문서</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-8 h-8 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{doc.category}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                      <a 
                        href={doc.filePath} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Download / 다운로드
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No completed meetings found / 완료된 미팅이 없습니다
              </h3>
              <p className="text-gray-500">
                Meeting summaries will appear here after meetings are completed
                <br />
                미팅 완료 후 요약이 여기에 표시됩니다
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMeetings.map((meeting) => (
            <Card key={meeting.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                      {meeting.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(meeting.scheduledDate), "PPP")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {getAttendeeName(meeting)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {getAttendeeType(meeting)}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Completed / 완료
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {meeting.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Description / 설명
                      </h4>
                      <p className="text-sm text-gray-600">{meeting.description}</p>
                    </div>
                  )}
                  {meeting.location && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Location / 장소
                      </h4>
                      <p className="text-sm text-gray-600">{meeting.location}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-gray-400">
                      Meeting ID: {meeting.id}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(meeting)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit / 편집
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        View Details / 상세보기
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredMeetings.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Showing {filteredMeetings.length} completed meeting(s) / 
            완료된 미팅 {filteredMeetings.length}개 표시
          </p>
        </div>
      )}

      {/* Edit Meeting Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Meeting / 미팅 편집</DialogTitle>
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

                {form.watch("attendeeType") === "investor" && (
                  <FormField
                    control={form.control}
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

                {form.watch("attendeeType") === "analyst" && (
                  <FormField
                    control={form.control}
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status / 상태</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status / 상태 선택" />
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

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel / 취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMeetingMutation.isPending}
                >
                  {updateMeetingMutation.isPending ? "Saving..." : "Save Changes / 변경사항 저장"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}