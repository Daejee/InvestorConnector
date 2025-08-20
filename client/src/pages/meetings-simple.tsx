import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Users, Clock, Eye, Edit, Trash2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Meeting, Investor, Analyst } from "@shared/schema";
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

export default function MeetingsSimple() {
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch data
  const { data: allMeetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

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

  // Helper functions
  const getAttendeeName = (meeting: Meeting) => {
    if (meeting.attendeeType === "investor" && meeting.investorId) {
      const investor = investors.find(i => i.id === meeting.investorId);
      return investor?.name || "Unknown Investor";
    }
    if (meeting.attendeeType === "analyst" && meeting.analystId) {
      const analyst = analysts.find(a => a.id === meeting.analystId);
      return analyst?.name || "Unknown Analyst";
    }
    return "Other";
  };

  const getAttendeeCompany = (meeting: Meeting) => {
    if (meeting.attendeeType === "investor" && meeting.investorId) {
      const investor = investors.find(i => i.id === meeting.investorId);
      return investor?.companyName || "";
    }
    if (meeting.attendeeType === "analyst" && meeting.analystId) {
      const analyst = analysts.find(a => a.id === meeting.analystId);
      return analyst?.firmName || "";
    }
    return "";
  };

  // Start editing a meeting
  const handleEdit = (meeting: Meeting) => {
    const scheduledDate = new Date(meeting.scheduledDate);
    const dateStr = scheduledDate.toISOString().split('T')[0];
    const timeStr = scheduledDate.toTimeString().split(' ')[0].substring(0, 5);
    
    editForm.reset({
      title: meeting.title,
      description: meeting.description || "",
      attendeeType: meeting.attendeeType as "investor" | "analyst" | "other",
      investorId: meeting.investorId,
      analystId: meeting.analystId,
      scheduledDate: dateStr,
      scheduledTime: timeStr,
      status: meeting.status as "scheduled" | "completed" | "cancelled"
    });
    
    setEditingMeeting(meeting);
  };

  // Update meeting mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EditMeetingForm & { id: number }) => {
      const response = await fetch(`/api/meetings/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update meeting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setEditingMeeting(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Meeting updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update meeting: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Delete meeting mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/meetings/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete meeting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({
        title: "Success",
        description: "Meeting deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete meeting: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handle form submission
  const handleEditSubmit = (data: EditMeetingForm) => {
    if (!editingMeeting) return;
    updateMutation.mutate({ ...data, id: editingMeeting.id });
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading meetings...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Calendar className="mr-3 h-6 w-6" />
          Meetings / 미팅
        </h2>
        <p className="text-gray-600 mt-1">Manage your meetings / 미팅 관리</p>
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {allMeetings.map((meeting: Meeting) => {
          const meetingDate = new Date(meeting.scheduledDate);
          
          return (
            <Card key={meeting.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Meeting Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {meeting.title}
                    </h3>
                    
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="mr-1 h-4 w-4" />
                        {format(meetingDate, "yyyy-MM-dd HH:mm")}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="mr-1 h-4 w-4" />
                        {getAttendeeName(meeting)}
                      </div>
                      <Badge variant="outline">
                        {meeting.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      {getAttendeeCompany(meeting)}
                    </p>
                    
                    {meeting.description && (
                      <p className="text-sm text-gray-700 mt-2">
                        {meeting.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingMeeting(meeting)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(meeting)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('정말 이 회의를 삭제하시겠습니까?')) {
                          deleteMutation.mutate(meeting.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View Meeting Dialog */}
      <Dialog open={!!viewingMeeting} onOpenChange={() => setViewingMeeting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meeting Details / 회의 상세</DialogTitle>
          </DialogHeader>
          {viewingMeeting && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{viewingMeeting.title}</h3>
                <p className="text-sm text-gray-600">
                  {format(new Date(viewingMeeting.scheduledDate), "yyyy-MM-dd HH:mm")}
                </p>
              </div>
              <div>
                <p className="text-sm"><strong>Attendee:</strong> {getAttendeeName(viewingMeeting)}</p>
                <p className="text-sm"><strong>Company:</strong> {getAttendeeCompany(viewingMeeting)}</p>
                <p className="text-sm"><strong>Status:</strong> {viewingMeeting.status}</p>
              </div>
              {viewingMeeting.description && (
                <div>
                  <p className="text-sm font-medium">Description:</p>
                  <p className="text-sm">{viewingMeeting.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Meeting Dialog */}
      <Dialog open={!!editingMeeting} onOpenChange={() => {
        setEditingMeeting(null);
        editForm.reset();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Meeting / 미팅 편집</DialogTitle>
          </DialogHeader>
          {editingMeeting && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description / 설명</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Meeting description" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex space-x-2 pt-4">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes / 저장"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingMeeting(null);
                      editForm.reset();
                    }}
                  >
                    Cancel / 취소
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