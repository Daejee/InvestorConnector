import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Download, Users, Calendar, FileText, Building, TrendingUp, Wallet } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

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
  const [activeTab, setActiveTab] = useState<string>("investor-reports");

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

  // Export report function
  const exportReport = () => {
    if (activeTab === "investor-reports" && investorReport) {
      // Export investor report as CSV
      const csvData = [
        ["필드", "값"],
        ["이름", investorReport.investor.name],
        ["이메일", investorReport.investor.email],
        ["전화", investorReport.investor.phone || "N/A"],
        ["소속기관", investorReport.investor.company],
        ["직책", investorReport.investor.position || "N/A"],
        ["직급", investorReport.investor.positionType || "N/A"],
        ["국가", investorReport.investor.country || "Korea"],
        ["언어", investorReport.investor.language || "Korean"],
        ["전문분야", investorReport.investor.specialty.join(", ")],
        ["당사 지분 보유", investorReport.investor.ownsOurShare || "No"],
        ["보유량", investorReport.investor.shareAmount || "N/A"],
        ["메모", investorReport.investor.note || "N/A"]
      ];
      
      const csvContent = csvData.map(row => row.join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `investor_report_${investorReport.investor.name}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeTab === "meeting-reports") {
      // Export meeting reports as CSV
      const csvData = [
        ["제목", "일시", "상태", "카테고리", "장소", "기간", "참석자", "설명"]
      ];
      
      filteredMeetings.forEach((meeting) => {
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
        
        csvData.push([
          meeting.title,
          format(new Date(meeting.scheduledDate), "yyyy-MM-dd HH:mm"),
          meeting.status,
          meeting.meetingCategory || "N/A",
          meeting.location || "N/A",
          `${meeting.duration || 60} minutes`,
          attendeeNames.join("; "),
          meeting.description || "N/A"
        ]);
      });
      
      const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `meeting_reports_${selectedDateRange}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // PDF 생성 함수
  const generateMeetingPDF = (meeting: Meeting) => {
    const doc = new jsPDF();
    
    // 헤더 배경색 설정
    doc.setFillColor(59, 130, 246); // blue-500
    doc.rect(0, 0, 210, 30, 'F');
    
    // 제목 (흰색)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Meeting Report", 20, 20);
    
    // 텍스트 색상을 검정으로 리셋
    doc.setTextColor(0, 0, 0);
    
    // 미팅 기본 정보 섹션
    let yPosition = 45;
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text("Meeting Information", 20, yPosition);
    yPosition += 5;
    
    // 구분선
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 15;
    
    // 미팅 정보 (검정색)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    
    const meetingTitle = meeting.title || "No Title";
    doc.text(`Title: ${meetingTitle}`, 20, yPosition);
    yPosition += 8;
    
    const meetingDate = format(new Date(meeting.scheduledDate), "yyyy-MM-dd HH:mm");
    doc.text(`Date & Time: ${meetingDate}`, 20, yPosition);
    yPosition += 8;
    
    doc.text(`Status: ${meeting.status}`, 20, yPosition);
    yPosition += 8;
    
    if (meeting.meetingCategory) {
      doc.text(`Category: ${meeting.meetingCategory}`, 20, yPosition);
      yPosition += 8;
    }
    
    if (meeting.location) {
      doc.text(`Location: ${meeting.location}`, 20, yPosition);
      yPosition += 8;
    }
    
    doc.text(`Duration: ${meeting.duration || 60} minutes`, 20, yPosition);
    yPosition += 15;
    
    // 참석자 섹션
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
    
    if (attendeeNames.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text("Attendees", 20, yPosition);
      yPosition += 5;
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 10;
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      
      attendeeNames.forEach(name => {
        doc.text(`• ${name}`, 25, yPosition);
        yPosition += 7;
      });
      yPosition += 10;
    }
    
    // 설명 섹션
    if (meeting.description) {
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text("Description", 20, yPosition);
      yPosition += 5;
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 10;
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      
      // 긴 텍스트를 여러 줄로 분할
      const splitText = doc.splitTextToSize(meeting.description, 170);
      splitText.forEach((line: string) => {
        if (yPosition > 270) { // 페이지 넘김
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 20, yPosition);
        yPosition += 6;
      });
      yPosition += 10;
    }
    
    // 회의록 파일 정보
    if (meeting.minutesFileName) {
      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text("Meeting Minutes", 20, yPosition);
      yPosition += 5;
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 10;
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`File: ${meeting.minutesFileName}`, 20, yPosition);
      yPosition += 10;
    }
    
    // 푸터
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 20, 285);
      doc.text(`Page ${i} of ${pageCount}`, 170, 285);
    }
    
    // PDF 다운로드
    const fileName = `meeting_report_${meeting.id}_${format(new Date(meeting.scheduledDate), "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">보고서</h2>
            <p className="text-gray-600 mt-1">투자자 및 미팅 종합 보고서 생성</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="investor-reports" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="investor-reports">투자자 보고서</TabsTrigger>
          <TabsTrigger value="meeting-reports">미팅 보고서</TabsTrigger>
        </TabsList>

        {/* Investor Reports Tab */}
        <TabsContent value="investor-reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                투자자 인적사항 보고서
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    투자자 선택
                  </label>
                  <Select value={selectedInvestor} onValueChange={setSelectedInvestor}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="투자자를 선택하세요" />
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
                        인적사항
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">이름:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.name}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">이메일:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.email}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">전화:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.phone || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">소속기관:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.company}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">직책:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.position || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">직급:</span>
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
                          <span className="text-sm font-medium text-gray-500">국가:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.country || "Korea"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">언어:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.language || "Korean"}</p>
                        </div>
                      </div>

                      {investorReport.investor.specialty.length > 0 && (
                        <div className="mt-4">
                          <span className="text-sm font-medium text-gray-500">전문분야:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {investorReport.investor.specialty.map((spec, index) => (
                              <Badge key={index} variant="outline">{spec}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {investorReport.investor.note && (
                        <div className="mt-4">
                          <span className="text-sm font-medium text-gray-500">메모:</span>
                          <p className="text-sm text-gray-900">{investorReport.investor.note}</p>
                        </div>
                      )}
                    </div>

                    {/* Fund Information */}
                    {investorReport.investor.fund && (
                      <div className="bg-blue-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Wallet className="mr-2 h-5 w-5" />
                          운용펀드
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-500">펀드명:</span>
                            <p className="text-sm text-gray-900">{investorReport.investor.fund}</p>
                          </div>
                          {investorReport.funds.map((fund) => (
                            <div key={fund.id} className="bg-white p-3 rounded border">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div>
                                  <span className="text-xs font-medium text-gray-500">운용자산(AUM in $billion):</span>
                                  <p className="text-sm text-gray-900">{fund.aum}</p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-gray-500">유형:</span>
                                  <p className="text-sm text-gray-900">{fund.type}</p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-gray-500">당사 보유:</span>
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
                          지분 보유 현황
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-500">당사 지분 보유:</span>
                            <Badge variant={investorReport.investor.ownsOurShare === "Yes" ? "default" : "outline"}>
                              {investorReport.investor.ownsOurShare}
                            </Badge>
                          </div>
                          {investorReport.investor.shareAmount && (
                            <div>
                              <span className="text-sm font-medium text-gray-500">보유량:</span>
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
                        미팅 이력 ({investorReport.meetings.length}건)
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
                                  <span className="text-gray-500">일시:</span>
                                  <p className="text-gray-900">
                                    {format(new Date(meeting.scheduledDate), "yyyy-MM-dd HH:mm")}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500">장소:</span>
                                  <p className="text-gray-900">{meeting.location || "N/A"}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">카테고리:</span>
                                  <p className="text-gray-900">{meeting.meetingCategory || "N/A"}</p>
                                </div>
                              </div>
                              {meeting.description && (
                                <div className="mt-2">
                                  <span className="text-sm text-gray-500">설명:</span>
                                  <p className="text-sm text-gray-700">{meeting.description}</p>
                                </div>
                              )}
                              {meeting.minutesFileName && (
                                <div className="mt-2">
                                  <span className="text-sm text-gray-500">회의록:</span>
                                  <p className="text-sm text-blue-600">{meeting.minutesFileName}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">기록된 미팅이 없습니다</p>
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
                미팅 보고서
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    기간 선택
                  </label>
                  <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="기간을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="30days">최근 30일</SelectItem>
                      <SelectItem value="90days">최근 90일</SelectItem>
                      <SelectItem value="year">최근 1년</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Detailed Meeting List */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      상세 미팅 보고서
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
                                <span className="text-sm font-medium text-gray-500">참석자:</span>
                                <div className="text-sm text-gray-900">
                                  {attendeeNames.length > 0 ? (
                                    <ul className="list-disc list-inside">
                                      {attendeeNames.map((name, index) => (
                                        <li key={index}>{name}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p>참석자 정보가 없습니다</p>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <span className="text-sm font-medium text-gray-500">장소:</span>
                                <p className="text-sm text-gray-900">{meeting.location || "N/A"}</p>
                                <span className="text-sm font-medium text-gray-500">시간:</span>
                                <p className="text-sm text-gray-900">{meeting.duration || 60} minutes</p>
                              </div>
                            </div>
                            
                            {meeting.description && (
                              <div className="mb-3">
                                <span className="text-sm font-medium text-gray-500">설명:</span>
                                <p className="text-sm text-gray-700">{meeting.description}</p>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mt-4">
                              <div>
                                {meeting.minutesFileName && (
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm text-blue-600">회의록: {meeting.minutesFileName}</span>
                                  </div>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => generateMeetingPDF(meeting)}
                                className="ml-4"
                              >
                                <Download className="mr-2 h-3 w-3" />
                                PDF 다운로드
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      
                      {filteredMeetings.length === 0 && (
                        <div className="text-center py-8">
                          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">미팅이 없습니다</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            선택한 기간에 미팅이 없습니다
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
