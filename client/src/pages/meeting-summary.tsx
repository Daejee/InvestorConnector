import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Calendar, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import type { Meeting, Investor, Analyst } from "@shared/schema";

export default function MeetingSummary() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allMeetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  // Filter completed meetings for summary
  const now = new Date();
  const completedMeetings = allMeetings.filter(meeting => 
    new Date(meeting.scheduledDate) < now
  ).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const filteredMeetings = completedMeetings.filter((meeting: Meeting) => {
    if (searchQuery === "") return true;
    
    const investor = investors.find((inv: Investor) => inv.id === meeting.investorId);
    const analyst = analysts.find((ana: Analyst) => ana.id === meeting.analystId);
    
    return meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           meeting.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           investor?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           analyst?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getAttendeeName = (meeting: Meeting) => {
    if (meeting.attendeeType === "investor") {
      const investor = investors.find((inv: Investor) => inv.id === meeting.investorId);
      return investor?.name || "Unknown Investor";
    } else {
      const analyst = analysts.find((ana: Analyst) => ana.id === meeting.analystId);
      return analyst?.name || "Unknown Analyst";
    }
  };

  const getAttendeeType = (meeting: Meeting) => {
    return meeting.attendeeType === "investor" ? "Buyside / 투자자" : "Sellside / 애널리스트";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
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

      <div className="mb-6 flex items-center gap-4">
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
                        <Clock className="h-4 w-4" />
                        {meeting.duration || 60} minutes
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
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View Details / 상세보기
                    </Button>
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
    </div>
  );
}