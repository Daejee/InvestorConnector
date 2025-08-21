import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Search, User, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import type { EmailLog } from "@shared/schema";

export default function EmailLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: emailLogs = [], isLoading } = useQuery({
    queryKey: ["/api/email-logs"],
    queryFn: async () => {
      const response = await fetch("/api/email-logs");
      if (!response.ok) {
        throw new Error("Failed to fetch email logs");
      }
      return response.json() as Promise<EmailLog[]>;
    },
  });

  // Filter logs based on search term and status
  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = 
      log.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || log.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalEmails = emailLogs.length;
  const sentEmails = emailLogs.filter(log => log.status === "sent").length;
  const failedEmails = emailLogs.filter(log => log.status === "failed").length;
  const pendingEmails = emailLogs.filter(log => log.status === "pending").length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="default" className="bg-green-100 text-green-800">성공</Badge>;
      case "failed":
        return <Badge variant="destructive">실패</Badge>;
      case "pending":
        return <Badge variant="secondary">대기</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">이메일 로그를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Mail className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">이메일 로그</h1>
            <p className="text-muted-foreground">전송된 이메일 기록 관리</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 이메일</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmails}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전송 성공</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{sentEmails}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전송 실패</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedEmails}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">대기 중</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingEmails}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="이메일, 제목, 내용으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedStatus === "all" ? "default" : "outline"}
            onClick={() => setSelectedStatus("all")}
            size="sm"
          >
            전체
          </Button>
          <Button
            variant={selectedStatus === "sent" ? "default" : "outline"}
            onClick={() => setSelectedStatus("sent")}
            size="sm"
          >
            성공
          </Button>
          <Button
            variant={selectedStatus === "failed" ? "default" : "outline"}
            onClick={() => setSelectedStatus("failed")}
            size="sm"
          >
            실패
          </Button>
          <Button
            variant={selectedStatus === "pending" ? "default" : "outline"}
            onClick={() => setSelectedStatus("pending")}
            size="sm"
          >
            대기
          </Button>
        </div>
      </div>

      {/* Email Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상태</TableHead>
                <TableHead>수신자</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>전송일시</TableHead>
                <TableHead>내용 미리보기</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Mail className="h-8 w-8 text-gray-400" />
                      <span className="text-muted-foreground">이메일 로그가 없습니다</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{log.recipientEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate font-medium">
                        {log.subject || "제목 없음"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {log.sentAt ? format(new Date(log.sentAt), "yyyy.MM.dd HH:mm") : "날짜 없음"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-sm truncate text-sm text-muted-foreground">
                        {log.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                        {log.content.length > 100 ? '...' : ''}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredLogs.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          총 {filteredLogs.length}개의 이메일 로그가 표시되고 있습니다
        </div>
      )}
    </div>
  );
}