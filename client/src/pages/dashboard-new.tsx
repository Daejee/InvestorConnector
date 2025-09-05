import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Calendar,
  Users,
  Clock,
  CheckCircle,
  MapPin,
  User,
  Plus,
  Mail
} from "lucide-react";
import type { Meeting, Investor, Analyst } from "@shared/schema";
import { useOrganization } from "@/contexts/OrganizationContext";

export default function Dashboard() {
  const { organizationId } = useOrganization();

  const { data: allMeetings, isLoading: meetingsLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings", organizationId],
    enabled: !!organizationId,
  });

  const { data: upcomingMeetings, isLoading: upcomingLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings/upcoming", organizationId],
    enabled: !!organizationId,
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors", organizationId],
    enabled: !!organizationId,
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts", organizationId],
    enabled: !!organizationId,
  });

  // Filter meetings into today and future meetings
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's meetings (scheduled for today)
  const todayMeetings = allMeetings?.filter(meeting => {
    const meetingDate = new Date(meeting.scheduledDate);
    meetingDate.setHours(0, 0, 0, 0);
    return meetingDate.getTime() === today.getTime();
  }).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()) || [];

  // Future meetings (tomorrow and beyond)
  const futureMeetings = allMeetings?.filter(meeting => {
    const meetingDate = new Date(meeting.scheduledDate);
    return meetingDate >= tomorrow;
  }).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()) || [];

  // Keep existing for stats
  const completedMeetings = allMeetings?.filter(meeting => 
    new Date(meeting.scheduledDate) < now
  ).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()) || [];

  const upcomingMeetingsList = upcomingMeetings || [];

  const getAttendeeInfo = (meeting: Meeting) => {
    if (meeting.investorIds && meeting.investorIds.length > 0) {
      const investorId = parseInt(meeting.investorIds[0]);
      const investor = investors.find(inv => inv.id === investorId);
      return investor ? { name: investor.name, type: 'Investor', company: investor.company } : null;
    }
    if (meeting.analystIds && meeting.analystIds.length > 0) {
      const analystId = parseInt(meeting.analystIds[0]);
      const analyst = analysts.find(a => a.id === analystId);
      return analyst ? { name: analyst.name, type: 'Analyst', company: analyst.company } : null;
    }
    if (meeting.analystId) {
      const analyst = analysts.find(a => a.id === meeting.analystId);
      return analyst ? { name: analyst.name, type: 'Analyst', company: analyst.company } : null;
    }
    return { name: 'Other / 기타', type: 'Other', company: '' };
  };

  const getStatusBadge = (meeting: Meeting) => {
    const isPast = new Date(meeting.scheduledDate) < now;
    if (isPast) {
      return <Badge className="bg-green-100 text-green-800">Completed / 완료</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800">Upcoming / 예정</Badge>;
    }
  };

  const formatDateTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return {
      date: dateObj.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      }),
      time: dateObj.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  // Calculate monthly meeting counts
  const getMonthlyMeetingCounts = () => {
    if (!allMeetings) return { thisMonth: 0, lastMonth: 0 };
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const thisMonthMeetings = allMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.scheduledDate);
      return meetingDate >= thisMonthStart && meetingDate <= now;
    });
    
    const lastMonthMeetings = allMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.scheduledDate);
      return meetingDate >= lastMonthStart && meetingDate <= lastMonthEnd;
    });
    
    return {
      thisMonth: thisMonthMeetings.length,
      lastMonth: lastMonthMeetings.length
    };
  };

  const monthlyMeetingCounts = getMonthlyMeetingCounts();

  return (
    <div>
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600 mt-1">미팅 개요 및 관리</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <Link href="/email">
              <Button variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                이메일링
              </Button>
            </Link>
            <Link href="/scheduling">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                미팅예약
              </Button>
            </Link>
          </div>
        </div>
      </div>
      {/* Meeting Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">이번 달</p>
                <p className="text-3xl font-bold text-gray-900">
                  {meetingsLoading ? "..." : monthlyMeetingCounts.thisMonth}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="text-blue-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">지난 달</p>
                <p className="text-3xl font-bold text-gray-900">
                  {meetingsLoading ? "..." : monthlyMeetingCounts.lastMonth}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="text-orange-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">예정된 미팅</p>
                <p className="text-3xl font-bold text-gray-900">
                  {upcomingLoading ? "..." : upcomingMeetingsList.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="text-green-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">완료된 미팅</p>
                <p className="text-3xl font-bold text-gray-900">
                  {meetingsLoading ? "..." : completedMeetings.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-purple-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Meetings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Meetings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>금일미팅일정</span>
              </CardTitle>
              <Link href="/meeting-logs">
                <Button variant="ghost" size="sm">전체보기</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {meetingsLoading ? (
              <p className="text-gray-500">Loading meetings...</p>
            ) : todayMeetings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No meetings today / 오늘 미팅이 없습니다</p>
                <Link href="/scheduling">
                  <Button variant="outline" className="mt-3">
                    미팅예약
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {todayMeetings.slice(0, 5).map((meeting) => {
                  const attendeeInfo = getAttendeeInfo(meeting);
                  const dateTime = formatDateTime(meeting.scheduledDate);
                  const date = new Date(meeting.scheduledDate);
                  const dayOfMonth = date.getDate();
                  const monthShort = (date.getMonth() + 1).toString().padStart(2, '0') + '월';
                  
                  return (
                    <div key={meeting.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-blue-50 hover:bg-blue-100">
                      <div className="flex flex-col items-center">
                        <div className="text-lg font-bold text-blue-600">
                          {monthShort}{dayOfMonth.toString().padStart(2, '0')}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-gray-900">{attendeeInfo?.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-gray-600" />
                            <span className="text-gray-700">{dateTime.time}</span>
                          </div>
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                            {meeting.meetingCategory || '탐방'}
                          </span>
                          {getStatusBadge(meeting)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {attendeeInfo?.company} • {attendeeInfo?.type === 'Investor' ? '투자자' : attendeeInfo?.type === 'Analyst' ? '애널리스트' : '기타'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future Meetings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>향후미팅일정</span>
              </CardTitle>
              <Link href="/meeting-logs">
                <Button variant="ghost" size="sm">전체보기</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {meetingsLoading ? (
              <p className="text-gray-500">Loading meetings...</p>
            ) : futureMeetings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No future meetings / 내일 이후 미팅이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {futureMeetings.slice(0, 5).map((meeting) => {
                  const attendeeInfo = getAttendeeInfo(meeting);
                  const dateTime = formatDateTime(meeting.scheduledDate);
                  const date = new Date(meeting.scheduledDate);
                  const dayOfMonth = date.getDate();
                  const monthShort = (date.getMonth() + 1).toString().padStart(2, '0') + '월';
                  
                  return (
                    <div key={meeting.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-blue-50 hover:bg-blue-100">
                      <div className="flex flex-col items-center">
                        <div className="text-lg font-bold text-blue-600">
                          {monthShort}{dayOfMonth.toString().padStart(2, '0')}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-gray-900">{attendeeInfo?.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-gray-600" />
                            <span className="text-gray-700">{dateTime.time}</span>
                          </div>
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                            {meeting.meetingCategory || '탐방'}
                          </span>
                          {getStatusBadge(meeting)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {attendeeInfo?.company} • {attendeeInfo?.type === 'Investor' ? '투자자' : attendeeInfo?.type === 'Analyst' ? '애널리스트' : '기타'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}