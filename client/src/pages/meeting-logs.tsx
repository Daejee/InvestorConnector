import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Eye, Edit, Trash2, Calendar, Users, Clock, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Meeting, Investor, Analyst } from "@shared/schema";

export default function Meetings() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: upcomingMeetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings/upcoming"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

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

  const filteredMeetings = upcomingMeetings.filter((meeting: Meeting) => {
    if (searchQuery === "") return true;
    
    const investor = investors.find((inv: Investor) => inv.id === meeting.investorId);
    const analyst = analysts.find((ana: Analyst) => ana.id === meeting.analystId);
    
    return meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           meeting.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           investor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           analyst?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getAttendeeName = (meeting: Meeting) => {
    if (meeting.attendeeType === "investor" && meeting.investorId) {
      const investor = investors.find((inv: Investor) => inv.id === meeting.investorId);
      return investor?.name || "Unknown Investor";
    } else if (meeting.attendeeType === "analyst" && meeting.analystId) {
      const analyst = analysts.find((ana: Analyst) => ana.id === meeting.analystId);
      return analyst?.name || "Unknown Analyst";
    }
    return "Other / 기타";
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

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="mr-3 h-6 w-6" />
              Upcoming Meetings / 예정된 미팅
            </h2>
            <p className="text-gray-600 mt-1">Your scheduled meetings for the coming weeks / 앞으로 몇 주간 예정된 미팅</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-6 text-center">Loading upcoming meetings...</div>
        ) : filteredMeetings.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No upcoming meetings found. Schedule your first meeting to get started.
          </div>
        ) : (
          filteredMeetings.map((meeting: Meeting) => {
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
                            {meeting.title || "Untitled Meeting"}
                          </h3>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {getAttendeeName(meeting)}
                            </div>
                            <div className="flex items-center">
                              <span className="text-gray-400">•</span>
                              <span className="ml-2">{getAttendeeType(meeting)}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {time}
                            </div>
                          </div>
                          
                          {meeting.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {meeting.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Status and Actions */}
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusBadgeColor(meeting.status)}>
                            {meeting.status}
                          </Badge>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Meeting
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => deleteMutation.mutate(meeting.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Meeting
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}