import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Mail, Users, FileText, Send, X, Paperclip, User, Building, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Investor, Analyst, Document } from "@shared/schema";

export default function Email() {
  const [recipients, setRecipients] = useState<{
    investors: number[];
    analysts: number[];
  }>({
    investors: [],
    analysts: []
  });
  const [attachments, setAttachments] = useState<number[]>([]);
  const [emailData, setEmailData] = useState({
    subject: "",
    content: "",
    recipientType: "individuals" // "individuals" | "group"
  });
  const [investorSearch, setInvestorSearch] = useState("");
  const [analystSearch, setAnalystSearch] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/email/send", data);
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Email has been sent successfully to selected recipients.",
      });
      // Reset form
      setRecipients({ investors: [], analysts: [] });
      setAttachments([]);
      setEmailData({ subject: "", content: "", recipientType: "individuals" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleInvestor = (investorId: number) => {
    setRecipients(prev => ({
      ...prev,
      investors: prev.investors.includes(investorId)
        ? prev.investors.filter(id => id !== investorId)
        : [...prev.investors, investorId]
    }));
  };

  const toggleAnalyst = (analystId: number) => {
    setRecipients(prev => ({
      ...prev,
      analysts: prev.analysts.includes(analystId)
        ? prev.analysts.filter(id => id !== analystId)
        : [...prev.analysts, analystId]
    }));
  };

  const toggleAttachment = (documentId: number) => {
    setAttachments(prev =>
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const selectAllInvestors = () => {
    setRecipients(prev => ({
      ...prev,
      investors: prev.investors.length === investors.length ? [] : investors.map(inv => inv.id)
    }));
  };

  const selectAllAnalysts = () => {
    setRecipients(prev => ({
      ...prev,
      analysts: prev.analysts.length === analysts.length ? [] : analysts.map(analyst => analyst.id)
    }));
  };

  const selectKoreanGroup = () => {
    const koreanInvestors = investors.filter(inv => 
      inv.specialty?.some(spec => spec.includes("Korea")) || 
      inv.company.toLowerCase().includes("korea") ||
      inv.company.toLowerCase().includes("한국")
    ).map(inv => inv.id);
    
    const koreanAnalysts = analysts.filter(analyst => 
      analyst.country === "Korea" || 
      analyst.language === "Korean"
    ).map(analyst => analyst.id);

    setRecipients({
      investors: koreanInvestors,
      analysts: koreanAnalysts
    });
  };

  const selectOverseasGroup = () => {
    const overseasInvestors = investors.filter(inv => 
      !inv.specialty?.some(spec => spec.includes("Korea")) && 
      !inv.company.toLowerCase().includes("korea") &&
      !inv.company.toLowerCase().includes("한국")
    ).map(inv => inv.id);
    
    const overseasAnalysts = analysts.filter(analyst => 
      analyst.country !== "Korea" && 
      analyst.language !== "Korean"
    ).map(analyst => analyst.id);

    setRecipients({
      investors: overseasInvestors,
      analysts: overseasAnalysts
    });
  };

  const handleSendEmail = () => {
    if (!emailData.subject.trim() || !emailData.content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both subject and content for the email.",
        variant: "destructive",
      });
      return;
    }

    if (recipients.investors.length === 0 && recipients.analysts.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please select at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    sendEmailMutation.mutate({
      subject: emailData.subject,
      content: emailData.content,
      recipients: recipients,
      attachments: attachments
    });
  };

  const getSelectedDocuments = () => {
    return documents.filter(doc => attachments.includes(doc.id));
  };

  const totalRecipients = recipients.investors.length + recipients.analysts.length;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Filter functions for search
  const filteredInvestors = investors.filter(investor =>
    investor.name.toLowerCase().includes(investorSearch.toLowerCase()) ||
    investor.company.toLowerCase().includes(investorSearch.toLowerCase()) ||
    investor.email.toLowerCase().includes(investorSearch.toLowerCase())
  );

  const filteredAnalysts = analysts.filter(analyst =>
    analyst.name.toLowerCase().includes(analystSearch.toLowerCase()) ||
    analyst.company.toLowerCase().includes(analystSearch.toLowerCase()) ||
    (analyst.email && analyst.email.toLowerCase().includes(analystSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">이메일링</h1>
          <p className="text-muted-foreground">Send emails to investors and analysts with document attachments / 문서 첨부와 함께 투자자 및 애널리스트에게 이메일 발송</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Composition */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Compose Email / 이메일 작성</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Subject / 제목</Label>
                <Input
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject / 이메일 제목을 입력하세요"
                />
              </div>

              <div>
                <Label>Content / 내용</Label>
                <Textarea
                  value={emailData.content}
                  onChange={(e) => setEmailData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter email content / 이메일 내용을 입력하세요"
                  rows={8}
                />
              </div>

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div>
                  <Label className="flex items-center space-x-2">
                    <Paperclip className="h-4 w-4" />
                    <span>Attachments / 첨부파일 ({attachments.length})</span>
                  </Label>
                  <div className="mt-2 space-y-2">
                    {getSelectedDocuments().map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{doc.originalName}</span>
                          <Badge variant="outline" className="text-xs">
                            {formatFileSize(doc.fileSize)}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAttachment(doc.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Send Button */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Recipients / 수신자: <Badge variant="outline">{totalRecipients}</Badge>
                </div>
                <Button 
                  onClick={handleSendEmail}
                  disabled={sendEmailMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{sendEmailMutation.isPending ? "Sending..." : "Send Email / 이메일 발송"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recipients and Attachments Sidebar */}
        <div className="space-y-6">
          {/* Recipients Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Recipients / 수신자</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Selection */}
              <div className="space-y-2">
                <Label>Quick Select / 빠른 선택</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={selectKoreanGroup}>
                    Korean / 한국
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectOverseasGroup}>
                    Overseas / 해외
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Investors */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Buyside / 투자자</Label>
                  <Button variant="ghost" size="sm" onClick={selectAllInvestors}>
                    {recipients.investors.length === investors.length ? "Clear All" : "Select All"}
                  </Button>
                </div>
                
                {/* Search input for investors */}
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="이름, 회사, 이메일로 검색..."
                    value={investorSearch}
                    onChange={(e) => setInvestorSearch(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
                
                <ScrollArea className="h-32 border rounded p-2">
                  <div className="space-y-2">
                    {filteredInvestors.map((investor) => (
                      <div key={investor.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={recipients.investors.includes(investor.id)}
                          onCheckedChange={() => toggleInvestor(investor.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{investor.name}</p>
                          <p className="text-xs text-gray-500 truncate">{investor.company}</p>
                        </div>
                        <User className="h-3 w-3 text-gray-400" />
                      </div>
                    ))}
                    {filteredInvestors.length === 0 && investorSearch && (
                      <p className="text-sm text-gray-500 text-center py-2">검색 결과가 없습니다</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Sellside */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Sellside / 애널리스트</Label>
                  <Button variant="ghost" size="sm" onClick={selectAllAnalysts}>
                    {recipients.analysts.length === analysts.length ? "Clear All" : "Select All"}
                  </Button>
                </div>
                
                {/* Search input for analysts */}
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="이름, 회사, 이메일로 검색..."
                    value={analystSearch}
                    onChange={(e) => setAnalystSearch(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
                
                <ScrollArea className="h-32 border rounded p-2">
                  <div className="space-y-2">
                    {filteredAnalysts.map((analyst) => (
                      <div key={analyst.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={recipients.analysts.includes(analyst.id)}
                          onCheckedChange={() => toggleAnalyst(analyst.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{analyst.name}</p>
                          <p className="text-xs text-gray-500 truncate">{analyst.company}</p>
                        </div>
                        <Building className="h-3 w-3 text-gray-400" />
                      </div>
                    ))}
                    {filteredAnalysts.length === 0 && analystSearch && (
                      <p className="text-sm text-gray-500 text-center py-2">검색 결과가 없습니다</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Document Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Paperclip className="h-5 w-5" />
                <span>Attachments / 첨부파일</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {documents.map((document) => (
                    <div key={document.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                      <Checkbox
                        checked={attachments.includes(document.id)}
                        onCheckedChange={() => toggleAttachment(document.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{document.originalName}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {document.category}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(document.fileSize)}
                          </span>
                        </div>
                      </div>
                      <FileText className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}