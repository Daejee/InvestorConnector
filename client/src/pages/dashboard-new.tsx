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

export default function Dashboard() {
  const { data: allMeetings, isLoading: meetingsLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: upcomingMeetings, isLoading: upcomingLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings/upcoming"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
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
    if (meeting.investorId) {
      const investor = investors.find(inv => inv.id === meeting.investorId);
      return investor ? { name: investor.name, type: 'Investor', company: investor.company } : null;
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
            <h2 className="text-2xl font-bold text-gray-900">Dashboard / 대시보드</h2>
            <p className="text-gray-600 mt-1">Meeting overview and management / 미팅 개요 및 관리</p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <Link href="/email">
              <Button variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Email / 이메일
              </Button>
            </Link>
            <Link href="/scheduling">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Meeting / 미팅 예약
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
                <p className="text-sm font-medium text-gray-600">This Month / 이번 달</p>
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
                <p className="text-sm font-medium text-gray-600">Last Month / 지난 달</p>
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
                <p className="text-sm font-medium text-gray-600">Upcoming / 예정된 미팅</p>
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
                <p className="text-sm font-medium text-gray-600">Completed / 완료된 미팅</p>
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
                <span>Today's Meetings / 오늘 미팅</span>
              </CardTitle>
              <Link href="/meeting-logs">
                <Button variant="ghost" size="sm">View All / 전체보기</Button>
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
                    Schedule Meeting / 미팅 예약
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {todayMeetings.slice(0, 5).map((meeting) => {
                  const attendeeInfo = getAttendeeInfo(meeting);
                  const dateTime = formatDateTime(meeting.scheduledDate);
                  
                  return (
                    <div key={meeting.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{meeting.title || 'Meeting'}</p>
                          <p className="text-xs text-gray-500">
                            {attendeeInfo?.name} - {attendeeInfo?.company}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500">{dateTime.date}</span>
                            <span className="text-xs text-gray-500">{dateTime.time}</span>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{meeting.attendeeType}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(meeting)}
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
                <span>Upcomig Meetings /향후미팅</span>
              </CardTitle>
              <Link href="/meeting-logs">
                <Button variant="ghost" size="sm">View All / 전체보기</Button>
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
                  
                  return (
                    <div key={meeting.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{meeting.title || 'Meeting'}</p>
                          <p className="text-xs text-gray-500">
                            {attendeeInfo?.name} - {attendeeInfo?.company}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500">{dateTime.date}</span>
                            <span className="text-xs text-gray-500">{dateTime.time}</span>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{meeting.attendeeType}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(meeting)}
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