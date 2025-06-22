import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Mail, Phone, Calendar, MessageSquare, FileText, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCommunicationSchema, insertEmailTemplateSchema, insertEmailCampaignSchema, type Communication, type Investor, type EmailTemplate, type EmailCampaign } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Communications() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: communications = [], isLoading } = useQuery<Communication[]>({
    queryKey: ["/api/communications"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: emailTemplates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
  });

  const { data: emailCampaigns = [] } = useQuery<EmailCampaign[]>({
    queryKey: ["/api/email-campaigns"],
  });

  const communicationForm = useForm({
    resolver: zodResolver(insertCommunicationSchema),
    defaultValues: {
      investorId: undefined,
      type: "email" as const,
      subject: "",
      description: "",
      status: "completed" as const,
    },
  });

  const templateForm = useForm({
    resolver: zodResolver(insertEmailTemplateSchema),
    defaultValues: {
      name: "",
      templateType: "earnings_report" as const,
      language: "Korean",
      subject: "",
      content: "",
    },
  });

  const campaignForm = useForm({
    resolver: zodResolver(insertEmailCampaignSchema),
    defaultValues: {
      name: "",
      templateId: undefined,
      status: "draft" as const,
      targetLanguage: "Korean",
      targetRegion: "Korea",
    },
  });

  const createCommunicationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/communications", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      setIsDialogOpen(false);
      communicationForm.reset();
      toast({
        title: "Communication logged successfully",
        description: "The communication record has been created.",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Sending template data to API:', data);
      const response = await apiRequest("POST", "/api/email-templates", data);
      console.log('API response:', response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
      toast({
        title: "Email template created",
        description: "The email template has been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Template creation error:', error);
      toast({
        title: "Error creating template",
        description: error.message || "Failed to create email template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/email-campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-campaigns"] });
      setIsCampaignDialogOpen(false);
      campaignForm.reset();
      toast({
        title: "Email campaign created",
        description: "The email campaign has been saved successfully.",
      });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: ({ campaignId, targetLanguage, targetRegion }: { campaignId: number, targetLanguage: string, targetRegion: string }) => 
      apiRequest("POST", `/api/email-campaigns/${campaignId}/send`, { targetLanguage, targetRegion }),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-campaigns"] });
      toast({
        title: "Campaign sent successfully",
        description: `Sent to ${result.sentCount} investors. ${result.failedCount || 0} failed.`,
      });
    },
  });

  const onSubmitCommunication = (data: any) => {
    createCommunicationMutation.mutate(data);
  };

  const onSubmitTemplate = (data: any) => {
    console.log('Template form data:', data);
    try {
      createTemplateMutation.mutate(data);
    } catch (error) {
      console.error('Template submission error:', error);
    }
  };

  const onSubmitCampaign = (data: any) => {
    createCampaignMutation.mutate(data);
  };

  const sendCampaign = (campaign: EmailCampaign) => {
    sendCampaignMutation.mutate({
      campaignId: campaign.id,
      targetLanguage: campaign.targetLanguage || "Korean",
      targetRegion: campaign.targetRegion || "Korea",
    });
  };

  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = comm.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comm.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || comm.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />;
      case "call": return <Phone className="h-4 w-4" />;
      case "meeting": return <Calendar className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "email": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "call": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "meeting": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "sent": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading communications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Communications / 소통</h1>
          <p className="text-muted-foreground">Manage investor communications and earnings reports / 투자자 소통 및 실적 보고서 관리</p>
        </div>
      </div>

      <Tabs defaultValue="communications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="communications">Communications / 소통 기록</TabsTrigger>
          <TabsTrigger value="templates">Email Templates / 이메일 템플릿</TabsTrigger>
          <TabsTrigger value="campaigns">Earnings Reports / 실적 보고서</TabsTrigger>
        </TabsList>

        <TabsContent value="communications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Communication Log / 소통 기록</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Log Communication / 소통 기록
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Log New Communication / 새 소통 기록</DialogTitle>
                  <DialogDescription>
                    Create a new communication record for investor interactions / 투자자와의 상호작용 기록을 생성합니다
                  </DialogDescription>
                </DialogHeader>
                <Form {...communicationForm}>
                  <form onSubmit={communicationForm.handleSubmit(onSubmitCommunication)} className="space-y-4">
                    <FormField
                      control={communicationForm.control}
                      name="investorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Investor / 투자자</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select investor / 투자자 선택" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {investors.map((investor) => (
                                <SelectItem key={investor.id} value={investor.id.toString()}>
                                  {investor.name} - {investor.company}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={communicationForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type / 유형</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email / 이메일</SelectItem>
                              <SelectItem value="call">Call / 전화</SelectItem>
                              <SelectItem value="meeting">Meeting / 미팅</SelectItem>
                              <SelectItem value="other">Other / 기타</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={communicationForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject / 제목</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Communication subject / 소통 제목" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={communicationForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content / 내용</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Communication details / 소통 상세 내용"
                              rows={4}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel / 취소
                      </Button>
                      <Button type="submit" disabled={createCommunicationMutation.isPending}>
                        {createCommunicationMutation.isPending ? "Saving..." : "Save Communication / 소통 저장"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search communications / 소통 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types / 모든 유형</SelectItem>
                <SelectItem value="email">Email / 이메일</SelectItem>
                <SelectItem value="call">Call / 전화</SelectItem>
                <SelectItem value="meeting">Meeting / 미팅</SelectItem>
                <SelectItem value="other">Other / 기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {filteredCommunications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No communications found / 소통 기록 없음</h3>
                  <p className="text-muted-foreground text-center">
                    Start logging your investor communications / 투자자 소통 기록을 시작하세요
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCommunications.map((communication) => {
                const investor = investors.find(inv => inv.id === communication.investorId);
                return (
                  <Card key={communication.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getTypeColor(communication.type)}>
                            {getTypeIcon(communication.type)}
                            <span className="ml-1 capitalize">{communication.type}</span>
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {investor ? `${investor.name} - ${investor.company}` : "Unknown investor"}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(communication.date).toLocaleDateString()}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{communication.subject}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{communication.description}</p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Email Templates / 이메일 템플릿</h2>
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template / 템플릿 생성
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Create Email Template / 이메일 템플릿 생성</DialogTitle>
                  <DialogDescription>
                    Create a new email template for investor communications / 투자자 소통용 이메일 템플릿을 생성합니다
                  </DialogDescription>
                </DialogHeader>
                <Form {...templateForm}>
                  <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={templateForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template Name / 템플릿 이름</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Q4 2024 Earnings Report" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={templateForm.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Language / 언어</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Korean">Korean / 한국어</SelectItem>
                                <SelectItem value="English">English / 영어</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={templateForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Subject / 이메일 제목</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="{{investorName}}님께 - 2024년 4분기 실적 보고서" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={templateForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Content / 이메일 내용</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Available variables: {{investorName}}, {{companyName}}, {{email}}, {{position}}, {{fund}}, {{country}}, {{language}}"
                              rows={10}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                        Cancel / 취소
                      </Button>
                      <Button type="submit" disabled={createTemplateMutation.isPending}>
                        {createTemplateMutation.isPending ? "Creating..." : "Create Template / 템플릿 생성"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {emailTemplates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No email templates / 이메일 템플릿 없음</h3>
                  <p className="text-muted-foreground text-center">
                    Create your first email template for earnings reports / 실적 보고서용 첫 이메일 템플릿을 생성하세요
                  </p>
                </CardContent>
              </Card>
            ) : (
              emailTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{template.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{template.language}</Badge>
                        <Badge variant="outline">{template.templateType}</Badge>
                      </div>
                    </div>
                    <CardDescription>{template.subject}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{template.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Earnings Report Campaigns / 실적 보고서 캠페인</h2>
            <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign / 캠페인 생성
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Earnings Report Campaign / 실적 보고서 캠페인 생성</DialogTitle>
                  <DialogDescription>
                    Create a new campaign to send earnings reports to investors / 투자자들에게 실적 보고서를 보낼 새 캠페인을 생성합니다
                  </DialogDescription>
                </DialogHeader>
                <Form {...campaignForm}>
                  <form onSubmit={campaignForm.handleSubmit(onSubmitCampaign)} className="space-y-4">
                    <FormField
                      control={campaignForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign Name / 캠페인 이름</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Q4 2024 Earnings Report Campaign" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={campaignForm.control}
                      name="templateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Template / 이메일 템플릿</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select template / 템플릿 선택" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {emailTemplates.map((template) => (
                                <SelectItem key={template.id} value={template.id.toString()}>
                                  {template.name} ({template.language})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={campaignForm.control}
                        name="targetLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Language / 대상 언어</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Korean">Korean / 한국어</SelectItem>
                                <SelectItem value="English">English / 영어</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={campaignForm.control}
                        name="targetRegion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Region / 대상 지역</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Korea">Korea / 한국</SelectItem>
                                <SelectItem value="United States">United States / 미국</SelectItem>
                                <SelectItem value="Europe">Europe / 유럽</SelectItem>
                                <SelectItem value="Asia">Asia / 아시아</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsCampaignDialogOpen(false)}>
                        Cancel / 취소
                      </Button>
                      <Button type="submit" disabled={createCampaignMutation.isPending}>
                        {createCampaignMutation.isPending ? "Creating..." : "Create Campaign / 캠페인 생성"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {emailCampaigns.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No campaigns created / 생성된 캠페인 없음</h3>
                  <p className="text-muted-foreground text-center">
                    Create your first earnings report campaign / 첫 실적 보고서 캠페인을 생성하세요
                  </p>
                </CardContent>
              </Card>
            ) : (
              emailCampaigns.map((campaign) => {
                const template = emailTemplates.find(t => t.id === campaign.templateId);
                const targetInvestors = investors.filter(investor => 
                  investor.language === campaign.targetLanguage && 
                  investor.country === campaign.targetRegion
                );
                
                return (
                  <Card key={campaign.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{campaign.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(campaign.status || "draft")}>
                            {campaign.status || "draft"}
                          </Badge>
                          {campaign.status === "draft" && (
                            <Button 
                              size="sm" 
                              onClick={() => sendCampaign(campaign)}
                              disabled={sendCampaignMutation.isPending}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send / 발송
                            </Button>
                          )}
                        </div>
                      </div>
                      <CardDescription>
                        Template: {template?.name} | Target: {campaign.targetLanguage} speakers in {campaign.targetRegion}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Users className="mr-1 h-4 w-4" />
                          {targetInvestors.length} target investors / 대상 투자자
                        </div>
                        {campaign.sentCount && (
                          <div className="flex items-center">
                            <Mail className="mr-1 h-4 w-4" />
                            {campaign.sentCount} sent / 발송됨
                          </div>
                        )}
                        {campaign.deliveredCount && (
                          <div className="flex items-center text-green-600">
                            <MessageSquare className="mr-1 h-4 w-4" />
                            {campaign.deliveredCount} delivered / 전달됨
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}