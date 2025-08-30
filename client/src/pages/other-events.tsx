import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Calendar, MapPin, User } from "lucide-react";
import type { OtherEvent, InsertOtherEvent } from "@shared/schema";
import OtherEventForm from "@/components/other-events/other-event-form";

export default function OtherEvents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<OtherEvent | null>(null);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery<OtherEvent[]>({
    queryKey: ["/api/other-events"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/other-events/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete event");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/other-events"] });
    },
  });

  const filteredEvents = events.filter((event: OtherEvent) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      event.name.toLowerCase().includes(searchLower) ||
      event.eventType.toLowerCase().includes(searchLower) ||
      event.location.toLowerCase().includes(searchLower) ||
      event.organizer.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string, startDate: Date, endDate?: Date | null) => {
    const now = new Date();
    const start = new Date(startDate.toString().split('T')[0] + 'T00:00:00');
    const end = endDate ? new Date(endDate.toString().split('T')[0] + 'T23:59:59') : start;
    
    if (status === "cancelled") {
      return <Badge variant="destructive">취소됨</Badge>;
    }
    
    if (now < start) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700">예정</Badge>;
    } else if (now >= start && now <= end) {
      return <Badge className="bg-green-100 text-green-800">진행중</Badge>;
    } else {
      return <Badge variant="secondary">완료</Badge>;
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    const colors = {
      "Roadshow": "bg-purple-50 text-purple-700",
      "Workshop": "bg-orange-50 text-orange-700",
      "Conference": "bg-blue-50 text-blue-700",
      "Meeting": "bg-green-50 text-green-700",
      "Other": "bg-gray-50 text-gray-700"
    };
    
    return (
      <Badge variant="outline" className={colors[eventType as keyof typeof colors] || colors.Other}>
        {eventType}
      </Badge>
    );
  };

  const handleEdit = (event: OtherEvent) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">기타이벤트</h2>
            <p className="text-gray-600 mt-1">기타 IR 이벤트 Database</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingEvent(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  이벤트 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingEvent ? "이벤트 수정" : "새 이벤트 추가"}
                  </DialogTitle>
                </DialogHeader>
                <OtherEventForm 
                  event={editingEvent}
                  onSuccess={handleCloseDialog}
                  onCancel={handleCloseDialog}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <Input
          placeholder="이름, 유형, 장소, 주최자로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이벤트명</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>날짜</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>장소</TableHead>
              <TableHead>주최자</TableHead>
              <TableHead>참석자</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  이벤트 로딩 중...
                </TableCell>
              </TableRow>
            ) : filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  {searchQuery ? "검색 결과가 없습니다." : "이벤트가 없습니다. 첫 번째 이벤트를 생성하세요."}
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event: OtherEvent) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div className="flex flex-col">
                        <span>{event.name}</span>
                        {event.description && (
                          <span className="text-xs text-gray-500 mt-1">{event.description.slice(0, 60)}...</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getEventTypeBadge(event.eventType)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(new Date(event.startDate.toString().split('T')[0] + 'T00:00:00'), "MMM dd, yyyy")}</div>
                      {event.endDate && (
                        <div className="text-gray-500">to {format(new Date(event.endDate.toString().split('T')[0] + 'T00:00:00'), "MMM dd, yyyy")}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(event.status, event.startDate, event.endDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{event.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{event.organizer}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {event.attendees && event.attendees.length > 0 ? (
                        <div>
                          <span className="font-medium">{event.attendees.length}명</span> 참석자
                          {event.attendees.length <= 3 && (
                            <div className="text-gray-500 mt-1">
                              {event.attendees.join(", ")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">참석자 없음</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(event)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(event.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}