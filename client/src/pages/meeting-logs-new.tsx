import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Eye, Edit, Trash2, Calendar, Users, Clock, MoreVertical, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Meeting, Investor, Analyst } from "@shared/schema";

export default function Meetings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [location] = useLocation();
  const queryClient = useQueryClient();

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
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Meeting
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate(meeting.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Meeting
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
    </div>
  );
}