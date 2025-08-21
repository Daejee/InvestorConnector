import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Download, Users, Calendar, FileText, Building, TrendingUp, Wallet } from "lucide-react";
import { format } from "date-fns";

interface Investor {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company: string;
  fund?: string;
  position?: string;
  positionType?: string;
  specialty: string[];
  ownsOurShare?: string;
  shareAmount?: string;
  note?: string;
  country?: string;
  language?: string;
}

interface Meeting {
  id: number;
  attendeeType: string;
  investorIds?: string[];
  analystIds?: string[];
  title: string;
  description?: string;
  scheduledDate: string;
  duration?: number;
  location?: string;
  meetingCategory?: string;
  status: string;
  minutesFileName?: string;
}

interface Analyst {
  id: number;
  name: string;
  email: string;
  company: string;
  position?: string;
  specialization: string[];
  country?: string;
}

interface Fund {
  id: number;
  name: string;
  aum: string;
  type: string;
  ownOurShares: boolean;
  shareAmount?: string;
}

export default function Reports() {
  const [selectedInvestor, setSelectedInvestor] = useState<string>("");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  const { data: funds = [] } = useQuery<Fund[]>({
    queryKey: ["/api/funds"],
  });

  // Generate investor profile report data
  const generateInvestorReport = (investorId: string) => {
    const investor = investors.find(inv => inv.id.toString() === investorId);
    if (!investor) return null;

    const investorMeetings = meetings.filter(meeting => 
      meeting.investorIds?.includes(investorId) && meeting.attendeeType === "investor"
    );

    const investorFunds = funds.filter(fund => 
      fund.name === investor.fund || fund.name.toLowerCase().includes(investor.company.toLowerCase())
    );

    return {
      investor,
      meetings: investorMeetings,
      funds: investorFunds
    };
  };

  // Filter meetings based on date range
  const filterMeetingsByDate = (meetings: Meeting[]) => {
    if (selectedDateRange === "all") return meetings;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (selectedDateRange) {
      case "30days":
        filterDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        filterDate.setDate(now.getDate() - 90);
        break;
      case "year":
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return meetings;
    }
    
    return meetings.filter(meeting => 
      new Date(meeting.scheduledDate) >= filterDate
    );
  };

  const filteredMeetings = filterMeetingsByDate(meetings);
  const investorReport = selectedInvestor ? generateInvestorReport(selectedInvestor) : null;

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reports / 보고서</h2>
            <p className="text-gray-600 mt-1">Generate comprehensive investor and meeting reports / 투자자 및 미팅 종합 보고서 생성</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export Report / 보고서 내보내기
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="investor-reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="investor-reports">Investor Reports / 투자자 보고서</TabsTrigger>
          <TabsTrigger value="meeting-reports">Meeting Reports / 미팅 보고서</TabsTrigger>
        </TabsList>

        {/* Investor Reports Tab */}
        <TabsContent value="investor-reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Investor Profile Reports / 투자자 인적사항 보고서
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Investor / 투자자 선택
                  </label>
                  <Select value={selectedInvestor} onValueChange={setSelectedInvestor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an investor / 투자자를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {investors.map((investor) => (
                        <SelectItem key={investor.id} value={investor.id.toString()}>
                          {investor.name} - {investor.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {investorReport && (
                  <div className="mt-6 space-y-6">
                    {/* Personal Information */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Personal Information / 인적사항
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">Name / 이름:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.name}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Email / 이메일:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.email}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Phone / 전화:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.phone || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Company / 소속기관:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.company}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Position / 직책:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.position || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Position Type / 직급:</span>
                          <div className="text-sm text-gray-900">
                            {investorReport.investor.positionType || "N/A"}
                            {investorReport.investor.positionType === "Buyside Analyst" && investorReport.investor.specialty.length > 0 && (
                              <div className="mt-1">
                                <span className="text-xs text-gray-500">담당섹터: </span>
                                <span className="text-xs text-blue-600">
                                  {investorReport.investor.specialty.join(", ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Country / 국가:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.country || "Korea"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Language / 언어:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.language || "Korean"}</p>
                        </div>
                      </div>

                      {investorReport.investor.specialty.length > 0 && (
                        <div className="mt-4">
                          <span className="text-sm font-medium text-gray-500">Specialties / 전문분야:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {investorReport.investor.specialty.map((spec, index) => (
                              <Badge key={index} variant="outline">{spec}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {investorReport.investor.note && (
                        <div className="mt-4">
                          <span className="text-sm font-medium text-gray-500">Notes / 메모:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.note}</p>
                        </div>
                      )}
                    </div>

                    {/* Fund Information */}
                    {investorReport.investor.fund && (
                      <div className="bg-blue-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Wallet className="mr-2 h-5 w-5" />
                          Fund Information / 운용펀드
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-500">Fund Name / 펀드명:</span>
                            <p className="text-sm text-gray-900">{investorReport.investor.fund}</p>
                          </div>
                          {investorReport.funds.map((fund) => (
                            <div key={fund.id} className="bg-white p-3 rounded border">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div>
                                  <span className="text-xs font-medium text-gray-500">AUM:</span>
                                  <p className="text-sm text-gray-900">{fund.aum}</p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-gray-500">Type / 유형:</span>
                                  <p className="text-sm text-gray-900">{fund.type}</p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-gray-500">Owns Our Shares / 당사 보유:</span>
                                  <Badge variant={fund.ownOurShares ? "default" : "outline"}>
                                    {fund.ownOurShares ? "Yes" : "No"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Share Ownership */}
                    {investorReport.investor.ownsOurShare && (
                      <div className="bg-green-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Share Ownership / 지분 보유 현황
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-500">Owns Our Shares / 당사 지분 보유:</span>
                            <Badge variant={investorReport.investor.ownsOurShare === "Yes" ? "default" : "outline"}>
                              {investorReport.investor.ownsOurShare}
                            </Badge>
                          </div>
                          {investorReport.investor.shareAmount && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">Share Amount / 보유량:</span>
                              <p className="text-sm text-gray-900">{investorReport.investor.shareAmount}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Meeting History */}
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Calendar className="mr-2 h-5 w-5" />
                        Meeting History / 미팅 이력 ({investorReport.meetings.length}건)
                      </h3>
                      {investorReport.meetings.length > 0 ? (
                        <div className="space-y-3">
                          {investorReport.meetings.map((meeting) => (
                            <div key={meeting.id} className="bg-white p-4 rounded border">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900">{meeting.title}</h4>
                                <Badge variant={meeting.status === "completed" ? "default" : "outline"}>
                                  {meeting.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-500">Date / 일시:</span>
                                  <p className="text-gray-900">
                                    {format(new Date(meeting.scheduledDate), "yyyy-MM-dd HH:mm")}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Location / 장소:</span>
                                  <p className="text-gray-900">{meeting.location || "N/A"}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Category / 카테고리:</span>
                                  <p className="text-gray-900">{meeting.meetingCategory || "N/A"}</p>
                                </div>
                              </div>
                              {meeting.description && (
                                <div className="mt-2">
                                  <span className="text-sm text-gray-500">Description / 설명:</span>
                                  <p className="text-sm text-gray-700">{meeting.description}</p>
                                </div>
                              )}
                              {meeting.minutesFileName && (
                                <div className="mt-2">
                                  <span className="text-sm text-gray-500">Minutes / 회의록:</span>
                                  <p className="text-sm text-blue-600">{meeting.minutesFileName}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No meetings recorded / 기록된 미팅이 없습니다</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meeting Reports Tab */}
        <TabsContent value="meeting-reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Meeting Reports / 미팅 보고서
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range / 기간 선택
                  </label>
                  <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time / 전체</SelectItem>
                      <SelectItem value="30days">Last 30 Days / 최근 30일</SelectItem>
                      <SelectItem value="90days">Last 90 Days / 최근 90일</SelectItem>
                      <SelectItem value="year">Last Year / 최근 1년</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                  {/* Meeting Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Meeting Statistics / 미팅 통계</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Meetings / 총 미팅</span>
                          <span className="text-sm font-medium">{filteredMeetings.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Completed / 완료</span>
                          <span className="text-sm font-medium">
                            {filteredMeetings.filter(m => m.status === "completed").length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Scheduled / 예정</span>
                          <span className="text-sm font-medium">
                            {filteredMeetings.filter(m => m.status === "scheduled").length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Investor Meetings / 투자자 미팅</span>
                          <span className="text-sm font-medium">
                            {filteredMeetings.filter(m => m.attendeeType === "investor").length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Analyst Meetings / 애널리스트 미팅</span>
                          <span className="text-sm font-medium">
                            {filteredMeetings.filter(m => m.attendeeType === "analyst").length}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Meeting Categories */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Meeting Categories / 미팅 카테고리</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {["내방", "Conference Call", "국내CorpDay", "국내NDR", "해외CorpDay", "해외NDR", "기타"].map(category => {
                          const count = filteredMeetings.filter(m => m.meetingCategory === category).length;
                          return (
                            <div key={category} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">{category}</span>
                              <Badge variant="outline">{count}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Meetings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recent Meetings / 최근 미팅</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {filteredMeetings
                          .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
                          .slice(0, 5)
                          .map((meeting) => (
                            <div key={meeting.id} className="border-l-2 border-blue-200 pl-3">
                              <h4 className="text-sm font-medium text-gray-900">{meeting.title}</h4>
                              <p className="text-xs text-gray-500">
                                {format(new Date(meeting.scheduledDate), "MM/dd HH:mm")}
                              </p>
                              <p className="text-xs text-gray-600">{meeting.meetingCategory}</p>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Meeting List */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      Detailed Meeting Reports / 상세 미팅 보고서
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredMeetings.map((meeting) => {
                        const attendeeNames = [];
                        
                        if (meeting.attendeeType === "investor" && meeting.investorIds) {
                          const meetingInvestors = investors.filter(inv => 
                            meeting.investorIds?.includes(inv.id.toString())
                          );
                          attendeeNames.push(...meetingInvestors.map(inv => `${inv.name} (${inv.company})`));
                        }
                        
                        if (meeting.attendeeType === "analyst" && meeting.analystIds) {
                          const meetingAnalysts = analysts.filter(analyst => 
                            meeting.analystIds?.includes(analyst.id.toString())
                          );
                          attendeeNames.push(...meetingAnalysts.map(analyst => `${analyst.name} (${analyst.company})`));
                        }

                        return (
                          <div key={meeting.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                                <p className="text-sm text-gray-600">
                                  {format(new Date(meeting.scheduledDate), "yyyy년 MM월 dd일 HH:mm")}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant={meeting.status === "completed" ? "default" : "outline"}>
                                  {meeting.status}
                                </Badge>
                                {meeting.meetingCategory && (
                                  <p className="text-xs text-gray-500 mt-1">{meeting.meetingCategory}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div>
                                <span className="text-sm font-medium text-gray-500">Attendees / 참석자:</span>
                                <div className="text-sm text-gray-900">
                                  {attendeeNames.length > 0 ? (
                                    <ul className="list-disc list-inside">
                                      {attendeeNames.map((name, index) => (
                                        <li key={index}>{name}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p>No attendee information available</p>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <span className="text-sm font-medium text-gray-500">Location / 장소:</span>
                                <p className="text-sm text-gray-900">{meeting.location || "N/A"}</p>
                                <span className="text-sm font-medium text-gray-500">Duration / 시간:</span>
                                <p className="text-sm text-gray-900">{meeting.duration || 60} minutes</p>
                              </div>
                            </div>
                            
                            {meeting.description && (
                              <div className="mb-3">
                                <span className="text-sm font-medium text-gray-500">Description / 설명:</span>
                                <p className="text-sm text-gray-700">{meeting.description}</p>
                              </div>
                            )}
                            
                            {meeting.minutesFileName && (
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="text-sm text-blue-600">Meeting Minutes: {meeting.minutesFileName}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {filteredMeetings.length === 0 && (
                        <div className="text-center py-8">
                          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No meetings found</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            No meetings found for the selected date range / 선택한 기간에 미팅이 없습니다
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
