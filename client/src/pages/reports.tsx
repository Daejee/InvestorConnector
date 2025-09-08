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
import html2canvas from "html2canvas";

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
  const generateMeetingPDF = async (meeting: Meeting) => {
    // 참석자 정보 가져오기
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

    // HTML 요소 생성
    const htmlContent = `
      <div style="
        font-family: 'Malgun Gothic', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        width: 800px;
        padding: 40px;
        background: white;
        color: #333;
        line-height: 1.6;
      ">
        <!-- 헤더 -->
        <div style="
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 30px;
          margin: -40px -40px 30px -40px;
          text-align: center;
          border-radius: 0 0 8px 8px;
        ">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">미팅 보고서</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Meeting Report</p>
        </div>

        <!-- 미팅 정보 섹션 -->
        <div style="margin-bottom: 30px;">
          <h2 style="
            color: #3b82f6;
            font-size: 18px;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
          ">📅 미팅 정보</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 12px; font-size: 14px;">
              <div style="font-weight: 600; color: #4b5563;">미팅 제목:</div>
              <div>${meeting.title || "제목 없음"}</div>
              
              <div style="font-weight: 600; color: #4b5563;">일시:</div>
              <div>${format(new Date(meeting.scheduledDate), "yyyy년 MM월 dd일 HH:mm")}</div>
              
              <div style="font-weight: 600; color: #4b5563;">상태:</div>
              <div>
                <span style="
                  background: ${meeting.status === 'completed' ? '#10b981' : '#6b7280'};
                  color: white;
                  padding: 4px 12px;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: 500;
                ">${meeting.status}</span>
              </div>
              
              ${meeting.meetingCategory ? `
                <div style="font-weight: 600; color: #4b5563;">카테고리:</div>
                <div>${meeting.meetingCategory}</div>
              ` : ''}
              
              ${meeting.location ? `
                <div style="font-weight: 600; color: #4b5563;">장소:</div>
                <div>${meeting.location}</div>
              ` : ''}
              
              <div style="font-weight: 600; color: #4b5563;">소요 시간:</div>
              <div>${meeting.duration || 60}분</div>
            </div>
          </div>
        </div>

        ${attendeeNames.length > 0 ? `
        <!-- 참석자 섹션 -->
        <div style="margin-bottom: 30px;">
          <h2 style="
            color: #3b82f6;
            font-size: 18px;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
          ">👥 참석자</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
            ${attendeeNames.map(name => `
              <div style="
                padding: 8px 0;
                border-bottom: 1px solid #e5e7eb;
                font-size: 14px;
              ">• ${name}</div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${meeting.description ? `
        <!-- 설명 섹션 -->
        <div style="margin-bottom: 30px;">
          <h2 style="
            color: #3b82f6;
            font-size: 18px;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
          ">📝 미팅 내용</h2>
          
          <div style="
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
            font-size: 14px;
            line-height: 1.7;
            white-space: pre-wrap;
          ">${meeting.description}</div>
        </div>
        ` : ''}

        ${meeting.minutesFileName ? `
        <!-- 회의록 섹션 -->
        <div style="margin-bottom: 30px;">
          <h2 style="
            color: #3b82f6;
            font-size: 18px;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
          ">📄 회의록</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
            <div style="display: flex; align-items: center; font-size: 14px;">
              <span style="margin-right: 8px;">📎</span>
              <span>${meeting.minutesFileName}</span>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- 푸터 -->
        <div style="
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        ">
          <p style="margin: 0;">생성일시: ${format(new Date(), "yyyy년 MM월 dd일 HH:mm")}</p>
        </div>
      </div>
    `;

    // 임시 DOM 요소 생성
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      // HTML을 캔버스로 변환
      const canvas = await html2canvas(tempDiv.firstElementChild as HTMLElement, {
        width: 800,
        height: tempDiv.firstElementChild?.scrollHeight || 1000,
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      // PDF 생성
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 폭
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // PDF 다운로드
      const fileName = `meeting_report_${meeting.id}_${format(new Date(meeting.scheduledDate), "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);

    } finally {
      // 임시 요소 제거
      document.body.removeChild(tempDiv);
    }
  };

  // Export investor personal report to PDF
  const exportInvestorReport = async (report: any) => {
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '40px';
    tempDiv.style.fontFamily = 'Malgun Gothic, sans-serif';

    const investorData = report.investor;
    const formattedDate = format(new Date(), 'yyyy년 MM월 dd일');

    tempDiv.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; background: white; font-family: 'Malgun Gothic', sans-serif;">
        <!-- Header with gradient background -->
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); padding: 30px; color: white; margin-bottom: 30px; border-radius: 8px;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <div style="width: 24px; height: 24px; background: white; border-radius: 50%; margin-right: 12px; display: flex; align-items: center; justify-content: center;">
              <span style="color: #3B82F6; font-weight: bold; font-size: 14px;">👤</span>
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">투자자 인적사항 보고서</h1>
          </div>
          <div style="font-size: 14px; opacity: 0.9;">
            생성일: ${formattedDate} | 보고서 대상: ${investorData.name}
          </div>
        </div>

        <!-- Personal Information Section -->
        <div style="background: #F8FAFC; padding: 30px; border-radius: 8px; border-left: 4px solid #3B82F6; margin-bottom: 30px;">
          <h2 style="color: #1E293B; font-size: 20px; font-weight: bold; margin: 0 0 20px 0;">📋 인적사항</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #E2E8F0;">
              <div style="color: #64748B; font-size: 12px; font-weight: 500; margin-bottom: 5px;">이름:</div>
              <div style="color: #0F172A; font-size: 14px; font-weight: 600;">${investorData.name}</div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #E2E8F0;">
              <div style="color: #64748B; font-size: 12px; font-weight: 500; margin-bottom: 5px;">이메일:</div>
              <div style="color: #0F172A; font-size: 14px;">${investorData.email || 'N/A'}</div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #E2E8F0;">
              <div style="color: #64748B; font-size: 12px; font-weight: 500; margin-bottom: 5px;">전화:</div>
              <div style="color: #0F172A; font-size: 14px;">${investorData.phone || 'N/A'}</div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #E2E8F0;">
              <div style="color: #64748B; font-size: 12px; font-weight: 500; margin-bottom: 5px;">소속기관:</div>
              <div style="color: #0F172A; font-size: 14px; font-weight: 600;">${investorData.company}</div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #E2E8F0;">
              <div style="color: #64748B; font-size: 12px; font-weight: 500; margin-bottom: 5px;">직책:</div>
              <div style="color: #0F172A; font-size: 14px;">${investorData.position || 'N/A'}</div>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #E2E8F0;">
              <div style="color: #64748B; font-size: 12px; font-weight: 500; margin-bottom: 5px;">직급:</div>
              <div style="color: #0F172A; font-size: 14px; font-weight: 600;">${investorData.positionType || 'PM'}</div>
            </div>
          </div>
        </div>

        <!-- Professional Information Section -->
        ${(investorData as any).totalExperience || (investorData as any).managedFundAum || (investorData as any).numberOfManagedFunds || (investorData as any).totalAssets ? `
        <div style="background: #F0F9FF; padding: 30px; border-radius: 8px; border-left: 4px solid #0EA5E9; margin-bottom: 30px;">
          <h2 style="color: #1E293B; font-size: 20px; font-weight: bold; margin: 0 0 20px 0;">💼 운용 정보</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            ${(investorData as any).totalExperience ? `
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #BAE6FD;">
              <div style="color: #0369A1; font-size: 12px; font-weight: 500; margin-bottom: 5px;">총 운용경력:</div>
              <div style="color: #0F172A; font-size: 14px; font-weight: 600;">${(investorData as any).totalExperience}</div>
            </div>
            ` : ''}
            
            ${(investorData as any).currentCompanyExperience ? `
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #BAE6FD;">
              <div style="color: #0369A1; font-size: 12px; font-weight: 500; margin-bottom: 5px;">현회사 운용경력:</div>
              <div style="color: #0F172A; font-size: 14px; font-weight: 600;">${(investorData as any).currentCompanyExperience}</div>
            </div>
            ` : ''}
            
            ${(investorData as any).managedFundAum ? `
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #BAE6FD;">
              <div style="color: #0369A1; font-size: 12px; font-weight: 500; margin-bottom: 5px;">운영자산:</div>
              <div style="color: #0F172A; font-size: 14px; font-weight: 600;">${parseFloat((investorData as any).managedFundAum).toLocaleString('ko-KR')} 백만원</div>
            </div>
            ` : ''}
            
            ${(investorData as any).numberOfManagedFunds ? `
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #BAE6FD;">
              <div style="color: #0369A1; font-size: 12px; font-weight: 500; margin-bottom: 5px;">운용펀드수:</div>
              <div style="color: #0F172A; font-size: 14px; font-weight: 600;">${(investorData as any).numberOfManagedFunds}개</div>
            </div>
            ` : ''}
            
            ${(investorData as any).totalAssets ? `
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #BAE6FD;">
              <div style="color: #0369A1; font-size: 12px; font-weight: 500; margin-bottom: 5px;">설정원본:</div>
              <div style="color: #0F172A; font-size: 14px; font-weight: 600;">${parseFloat((investorData as any).totalAssets).toLocaleString('ko-KR')} 백만원</div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Meeting History Section -->
        ${report.meetings && report.meetings.length > 0 ? `
        <div style="background: #FEF3C7; padding: 30px; border-radius: 8px; border-left: 4px solid #F59E0B; margin-bottom: 30px;">
          <h2 style="color: #1E293B; font-size: 20px; font-weight: bold; margin: 0 0 20px 0;">📅 미팅 이력</h2>
          
          <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #FCD34D;">
            <div style="background: #FFFBEB; padding: 15px; border-bottom: 1px solid #FCD34D; font-weight: 600; color: #92400E; font-size: 12px;">
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 10px; align-items: center;">
                <div>제목</div>
                <div>날짜</div>
                <div>시간</div>
                <div>장소</div>
                <div>상태</div>
              </div>
            </div>
            ${report.meetings.slice(0, 10).map((meeting: any) => {
              const meetingDate = new Date(meeting.scheduledDate);
              const formattedDate = meetingDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
              const formattedTime = meetingDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
              const statusColor = meeting.status === 'completed' ? '#10B981' : meeting.status === 'scheduled' ? '#3B82F6' : '#6B7280';
              const statusBg = meeting.status === 'completed' ? '#DCFCE7' : meeting.status === 'scheduled' ? '#DBEAFE' : '#F3F4F6';
              const statusText = meeting.status === 'completed' ? '완료' : meeting.status === 'scheduled' ? '예정' : meeting.status;
              
              return `
              <div style="padding: 12px 15px; border-bottom: 1px solid #FEF3C7; font-size: 13px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 10px; align-items: center;">
                  <div style="color: #0F172A; font-weight: 500;">${meeting.title || '미팅'}</div>
                  <div style="color: #374151;">${formattedDate}</div>
                  <div style="color: #374151;">${formattedTime}</div>
                  <div style="color: #374151;">${meeting.location || '-'}</div>
                  <div>
                    <span style="background: ${statusBg}; color: ${statusColor}; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 500;">${statusText}</span>
                  </div>
                </div>
                ${meeting.description ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #FEF3C7;">
                  <div style="color: #6B7280; font-size: 11px; margin-bottom: 4px;">미팅 내용:</div>
                  <div style="color: #374151; font-size: 12px; line-height: 1.4;">${meeting.description.length > 100 ? meeting.description.substring(0, 100) + '...' : meeting.description}</div>
                </div>
                ` : ''}
              </div>
              `;
            }).join('')}
            ${report.meetings.length > 10 ? `
            <div style="padding: 12px 15px; text-align: center; color: #6B7280; font-size: 12px; font-style: italic;">
              총 ${report.meetings.length}개 미팅 중 최근 10개 표시
            </div>
            ` : ''}
          </div>
          
          <!-- Meeting Summary -->
          <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #FCD34D;">
              <div style="color: #D97706; font-size: 20px; font-weight: bold;">${report.meetings.length}</div>
              <div style="color: #92400E; font-size: 12px; font-weight: 500;">총 미팅 수</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #FCD34D;">
              <div style="color: #10B981; font-size: 20px; font-weight: bold;">${report.meetings.filter((m: any) => m.status === 'completed').length}</div>
              <div style="color: #92400E; font-size: 12px; font-weight: 500;">완료된 미팅</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #FCD34D;">
              <div style="color: #3B82F6; font-size: 20px; font-weight: bold;">${report.meetings.filter((m: any) => m.status === 'scheduled').length}</div>
              <div style="color: #92400E; font-size: 12px; font-weight: 500;">예정된 미팅</div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Additional Information Section -->
        ${investorData.specialty?.length > 0 || investorData.note ? `
        <div style="background: #F0FDF4; padding: 30px; border-radius: 8px; border-left: 4px solid #10B981; margin-bottom: 20px;">
          <h2 style="color: #1E293B; font-size: 20px; font-weight: bold; margin: 0 0 20px 0;">📈 추가 정보</h2>
          
          ${investorData.specialty?.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <div style="color: #059669; font-size: 12px; font-weight: 500; margin-bottom: 10px;">전문분야:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${investorData.specialty.map((spec: string) => `
                <span style="background: #DCFCE7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${spec}</span>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          ${investorData.note ? `
          <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #BBF7D0;">
            <div style="color: #059669; font-size: 12px; font-weight: 500; margin-bottom: 5px;">메모:</div>
            <div style="color: #0F172A; font-size: 14px; line-height: 1.5;">${investorData.note}</div>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; border-top: 1px solid #E2E8F0; color: #64748B; font-size: 12px;">
          <div style="margin-bottom: 5px;">IR CRM - 투자자 관계 관리 시스템</div>
          <div>© ${new Date().getFullYear()} All rights reserved.</div>
        </div>
      </div>
    `;

    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        width: 800,
        height: tempDiv.scrollHeight
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const fileName = `investor_report_${investorData.name}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);

    } finally {
      document.body.removeChild(tempDiv);
    }
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  투자자 인적사항 보고서
                </CardTitle>
                {investorReport && (
                  <Button
                    onClick={() => exportInvestorReport(investorReport)}
                    className="flex items-center space-x-2"
                    variant="outline"
                  >
                    <Download className="h-4 w-4" />
                    <span>PDF 다운로드</span>
                  </Button>
                )}
              </div>
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
                            {investorReport.investor.positionType || "PM"}
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
                        
                        {/* Portfolio Management Fields */}
                        {(investorReport.investor as any).totalExperience && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">총 운용경력:</span>
                            <p className="text-sm text-gray-900">{(investorReport.investor as any).totalExperience}</p>
                          </div>
                        )}
                        
                        {(investorReport.investor as any).currentCompanyExperience && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">현회사 운용경력:</span>
                            <p className="text-sm text-gray-900">{(investorReport.investor as any).currentCompanyExperience}</p>
                          </div>
                        )}
                        
                        {(investorReport.investor as any).managedFundAum && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">운영자산:</span>
                            <p className="text-sm text-gray-900">
                              {parseFloat((investorReport.investor as any).managedFundAum).toLocaleString('ko-KR')} 백만원
                            </p>
                          </div>
                        )}
                        
                        {(investorReport.investor as any).numberOfManagedFunds && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">운용펀드수:</span>
                            <p className="text-sm text-gray-900">{(investorReport.investor as any).numberOfManagedFunds}개</p>
                          </div>
                        )}
                        
                        {(investorReport.investor as any).totalAssets && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">설정원본:</span>
                            <p className="text-sm text-gray-900">
                              {parseFloat((investorReport.investor as any).totalAssets).toLocaleString('ko-KR')} 백만원
                            </p>
                          </div>
                        )}
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
