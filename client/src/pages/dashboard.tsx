import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  Users,
  Clock,
  CheckCircle,
  MapPin,
  User
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

  // Filter meetings into completed and upcoming
  const now = new Date();
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

  return (
    <div>
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard / 대시보드</h2>
            <p className="text-gray-600 mt-1">Overview of your investor relations activities / 투자자 관계 활동 개요</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Investor
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Investors</p>
                <p className="text-3xl font-bold text-gray-900">
                  {statsLoading ? "..." : stats?.totalInvestors || 0}
                </p>
                <p className="text-sm text-green-600 mt-1 flex items-center">
                  <ArrowUp className="mr-1 h-3 w-3" />
                  12% vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total AUM</p>
                <p className="text-3xl font-bold text-gray-900">
                  {statsLoading ? "..." : formatCurrency(stats?.totalAum || 0)}
                </p>
                <p className="text-sm text-green-600 mt-1 flex items-center">
                  <ArrowUp className="mr-1 h-3 w-3" />
                  8% vs last quarter
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="text-green-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Investments</p>
                <p className="text-3xl font-bold text-gray-900">
                  {statsLoading ? "..." : stats?.activeInvestments || 0}
                </p>
                <p className="text-sm text-yellow-600 mt-1 flex items-center">
                  <ArrowDown className="mr-1 h-3 w-3" />
                  3% vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <PieChart className="text-yellow-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Meetings This Week</p>
                <p className="text-3xl font-bold text-gray-900">
                  {statsLoading ? "..." : stats?.meetingsThisWeek || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">6 upcoming</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="text-purple-600 h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Investors */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Investors</CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <InvestorTable investors={recentInvestors?.slice(0, 5) || []} isLoading={investorsLoading} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Meetings */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {meetingsLoading ? (
                  <p className="text-sm text-gray-500">Loading meetings...</p>
                ) : upcomingMeetings?.length === 0 ? (
                  <p className="text-sm text-gray-500">No upcoming meetings</p>
                ) : (
                  upcomingMeetings?.slice(0, 3).map((meeting) => (
                    <div key={meeting.id} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                        <p className="text-xs text-gray-500">
                          {meeting.scheduledDate ? new Date(meeting.scheduledDate).toLocaleString() : "No date"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                
                <Button variant="ghost" size="sm" className="w-full mt-4">
                  View All Meetings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Communications */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Communications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {communicationsLoading ? (
                  <p className="text-sm text-gray-500">Loading communications...</p>
                ) : recentCommunications?.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent communications</p>
                ) : (
                  recentCommunications?.slice(0, 3).map((comm) => (
                    <div key={comm.id} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        {comm.type === "email" && <Mail className="text-blue-600 h-4 w-4" />}
                        {comm.type === "call" && <Phone className="text-green-600 h-4 w-4" />}
                        {comm.type === "meeting" && <Calendar className="text-purple-600 h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{comm.subject}</p>
                        <p className="text-xs text-gray-500">{comm.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {comm.date ? new Date(comm.date).toLocaleDateString() : "No date"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">This Week</span>
                  <span className="text-sm font-medium text-gray-900">18 Interactions</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">This Month</span>
                  <span className="text-sm font-medium text-gray-900">127 Interactions</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Response Time</span>
                  <span className="text-sm font-medium text-gray-900">2.4 hours</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
