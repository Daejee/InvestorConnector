import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Search, Upload, Download, Trash2, FileText, Plus, Edit, Brain, Clock, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type { AnalystReport, Analyst, AnalystReportAnalysis } from "@/../../shared/schema";

// Form validation schema
const uploadReportSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  analystId: z.number().min(1, "애널리스트를 선택해주세요"),
  description: z.string().optional(),
  publishDate: z.string().min(1, "발행일을 선택해주세요"),
});

type UploadReportForm = z.infer<typeof uploadReportSchema>;

export default function AnalystReports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingReport, setEditingReport] = useState<AnalystReport | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalystReportAnalysis | null>(null);
  const [analysisStates, setAnalysisStates] = useState<Record<number, 'analyzing' | 'completed' | 'failed'>>({});
  const queryClient = useQueryClient();

  // Fetch analyst reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery<AnalystReport[]>({
    queryKey: ["/api/analyst-reports"],
  });

  // Fetch analysts for the dropdown
  const { data: analysts = [] } = useQuery<Analyst[]>({
    queryKey: ["/api/analysts"],
  });

  const form = useForm<UploadReportForm>({
    resolver: zodResolver(uploadReportSchema),
    defaultValues: {
      title: "",
      analystId: 0,
      description: "",
      publishDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const editForm = useForm<UploadReportForm>({
    resolver: zodResolver(uploadReportSchema),
    defaultValues: {
      title: "",
      analystId: 0,
      description: "",
      publishDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: UploadReportForm & { file: File }) => {
      try {
        // Get upload URL
        console.log("Requesting upload URL...");
        const uploadRes = await apiRequest("/api/objects/upload", {
          method: "POST",
        });
        
        const uploadResponse = (await uploadRes.json()) as { uploadURL: string };
        console.log("Upload response received:", uploadResponse);
        
        if (!uploadResponse || !uploadResponse.uploadURL) {
          console.error("Invalid upload response:", {
            response: uploadResponse,
            hasUploadURL: uploadResponse && 'uploadURL' in uploadResponse,
            uploadURL: uploadResponse?.uploadURL
          });
          throw new Error("업로드 URL을 받지 못했습니다");
        }
        
        console.log("Upload URL obtained:", uploadResponse.uploadURL);
        
        // Upload file to object storage
        const uploadResult = await fetch(uploadResponse.uploadURL, {
          method: "PUT",
          body: data.file,
          headers: {
            "Content-Type": data.file.type,
          },
        });

        if (!uploadResult.ok) {
          throw new Error("파일 업로드에 실패했습니다");
        }

        // Save report metadata
        const filePath = uploadResponse.uploadURL.split('?')[0]; // Remove query params
        const reportData = {
          organizationId: 1, // TODO: Get from auth context
          title: data.title,
          analystId: data.analystId,
          description: data.description || null,
          publishDate: data.publishDate,
          originalFileName: data.file.name,
          filePath: filePath,
          fileSize: data.file.size,
          fileType: data.file.type,
          uploadedBy: "System", // TODO: Get from user context
        };

        return await apiRequest("/api/analyst-reports", {
          method: "POST",
          body: reportData,
        });
      } catch (error) {
        console.error("Upload error details:", {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          error: error
        });
        
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error('알 수 없는 오류가 발생했습니다');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyst-reports"] });
      setIsUploadOpen(false);
      setSelectedFile(null);
      form.reset();
      toast({
        title: "성공",
        description: "애널리스트 분석 리포트가 업로드되었습니다",
      });
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: `업로드에 실패했습니다: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Edit report mutation
  const editMutation = useMutation({
    mutationFn: async (data: UploadReportForm & { id: number }) => {
      const { id, ...updateData } = data;
      return await apiRequest(`/api/analyst-reports/${id}`, {
        method: "PATCH",
        body: updateData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyst-reports"] });
      setIsEditOpen(false);
      setEditingReport(null);
      editForm.reset();
      toast({
        title: "성공",
        description: "리포트가 수정되었습니다",
      });
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: `수정에 실패했습니다: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete report mutation
  const deleteMutation = useMutation({
    mutationFn: (reportId: number) => 
      apiRequest(`/api/analyst-reports/${reportId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyst-reports"] });
      toast({
        title: "성공",
        description: "리포트가 삭제되었습니다",
      });
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: `삭제에 실패했습니다: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // AI Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: (reportId: number) => 
      apiRequest(`/api/analyst-reports/${reportId}/analyze`, { method: "POST" }),
    onSuccess: (result: any, reportId) => {
      // Check the analysis status from the response
      if (result.analysisStatus === 'completed') {
        setAnalysisStates(prev => ({ ...prev, [reportId]: 'completed' }));
        toast({
          title: "AI 분석 완료",
          description: "리포트 분석이 완료되었습니다.",
        });
      } else if (result.analysisStatus === 'failed') {
        setAnalysisStates(prev => ({ ...prev, [reportId]: 'failed' }));
        toast({
          title: "분석 실패",
          description: "AI 분석에 실패했습니다.",
          variant: "destructive",
        });
      } else {
        // Still analyzing - shouldn't happen with sync processing
        setAnalysisStates(prev => ({ ...prev, [reportId]: 'analyzing' }));
        toast({
          title: "AI 분석 중",
          description: "리포트 분석이 진행 중입니다.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "분석 실패",
        description: `AI 분석에 실패했습니다: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (50MB limit)
      if (file.size > 52428800) {
        toast({
          title: "파일 크기 오류",
          description: "파일 크기는 50MB를 초과할 수 없습니다",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = (data: UploadReportForm) => {
    if (!selectedFile) {
      toast({
        title: "파일 선택 필요",
        description: "업로드할 파일을 선택해주세요",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate({ ...data, file: selectedFile });
  };

  const handleEdit = (report: AnalystReport) => {
    setEditingReport(report);
    editForm.reset({
      title: report.title,
      analystId: report.analystId,
      description: report.description || "",
      publishDate: report.publishDate,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = (data: UploadReportForm) => {
    if (!editingReport) return;
    editMutation.mutate({ ...data, id: editingReport.id });
  };

  const getAnalysisIcon = (reportId: number) => {
    const state = analysisStates[reportId];
    switch (state) {
      case 'analyzing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Brain className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAnalysisButtonText = (reportId: number) => {
    const state = analysisStates[reportId];
    switch (state) {
      case 'analyzing':
        return "분석 중...";
      case 'completed':
        return "분석 완료";
      case 'failed':
        return "분석 재시도";
      default:
        return "AI 분석";
    }
  };

  const handleViewAnalysis = async (reportId: number) => {
    try {
      const analysis = await apiRequest(`/api/analyst-reports/${reportId}/analysis`);
      setSelectedAnalysis(analysis as AnalystReportAnalysis);
      setIsAnalysisOpen(true);
    } catch (error) {
      toast({
        title: "분석 결과 로드 실패",
        description: "분석 결과를 불러올 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (report: AnalystReport) => {
    // Create download link using the file path
    const downloadUrl = report.filePath.replace('/replit-objstore-', '/objects/');
    window.open(downloadUrl, '_blank');
  };

  const getAnalystName = (analystId: number) => {
    const analyst = analysts.find((a) => a.id === analystId);
    return analyst ? analyst.name : "Unknown";
  };

  const getAnalystCompany = (analystId: number) => {
    const analyst = analysts.find((a) => a.id === analystId);
    return analyst ? analyst.company : "Unknown";
  };

  // Filter reports based on search query
  const filteredReports = reports.filter((report) =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getAnalystName(report.analystId).toLowerCase().includes(searchQuery.toLowerCase()) ||
    getAnalystCompany(report.analystId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>애널리스트 분석요약</span>
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  분석 리포트 업로드
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>애널리스트 분석 리포트 업로드</DialogTitle>
                  <DialogDescription>
                    애널리스트의 분석 리포트를 업로드하고 정보를 입력하세요
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>리포트 제목</FormLabel>
                          <FormControl>
                            <Input placeholder="리포트 제목을 입력하세요" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="analystId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>애널리스트 선택</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="애널리스트를 선택하세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {analysts.map((analyst) => (
                                <SelectItem key={analyst.id} value={analyst.id.toString()}>
                                  {analyst.name} - {analyst.company}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="publishDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>발행일</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>설명</FormLabel>
                          <FormControl>
                            <textarea
                              placeholder="리포트에 대한 설명을 입력하세요"
                              className="w-full min-h-[80px] px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div>
                      <FormLabel>파일 업로드</FormLabel>
                      <div className="mt-2 space-y-2">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                          onChange={handleFileSelect}
                        />
                        {selectedFile && (
                          <div className="text-sm text-gray-600">
                            선택된 파일: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsUploadOpen(false);
                          setSelectedFile(null);
                          form.reset();
                        }}
                      >
                        취소
                      </Button>
                      <Button type="submit" disabled={uploadMutation.isPending}>
                        {uploadMutation.isPending ? "업로드 중..." : "업로드"}
                      </Button>
                    </div>
                  </form>
                </Form>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            애널리스트들의 분석 리포트를 업로드하고 관리하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="제목, 애널리스트명, 증권사로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Reports Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>리포트 제목</TableHead>
                  <TableHead>애널리스트</TableHead>
                  <TableHead>증권사</TableHead>
                  <TableHead>발행일</TableHead>
                  <TableHead>파일 크기</TableHead>
                  <TableHead>업로드일</TableHead>
                  <TableHead className="text-center">AI 분석</TableHead>
                  <TableHead className="text-center">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {searchQuery ? "검색 결과가 없습니다" : "등록된 리포트가 없습니다"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="font-medium">{report.title}</div>
                            {report.description && (
                              <div className="text-sm text-gray-500 max-w-xs truncate">
                                {report.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getAnalystName(report.analystId)}</TableCell>
                      <TableCell>{getAnalystCompany(report.analystId)}</TableCell>
                      <TableCell>
                        {format(new Date(report.publishDate), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(report.fileSize / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.createdAt && format(new Date(report.createdAt), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (analysisStates[report.id] === 'completed') {
                              handleViewAnalysis(report.id);
                            } else {
                              analysisMutation.mutate(report.id);
                            }
                          }}
                          disabled={analysisStates[report.id] === 'analyzing' || analysisMutation.isPending}
                          title={getAnalysisButtonText(report.id)}
                          className="flex items-center space-x-1"
                        >
                          {getAnalysisIcon(report.id)}
                          <span className="text-xs">{getAnalysisButtonText(report.id)}</span>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(report)}
                            title="다운로드"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(report)}
                            title="편집"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(report.id)}
                            title="삭제"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>애널리스트 분석 리포트 편집</DialogTitle>
            <DialogDescription>
              리포트 정보를 수정하세요 (파일은 변경할 수 없습니다)
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>리포트 제목</FormLabel>
                      <FormControl>
                        <Input placeholder="리포트 제목을 입력하세요" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="analystId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>애널리스트 선택</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="애널리스트를 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {analysts.map((analyst) => (
                            <SelectItem key={analyst.id} value={analyst.id.toString()}>
                              {analyst.name} - {analyst.company}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="publishDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>발행일</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>설명</FormLabel>
                      <FormControl>
                        <textarea
                          placeholder="리포트에 대한 설명을 입력하세요"
                          className="w-full min-h-[80px] px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditOpen(false);
                      setEditingReport(null);
                      editForm.reset();
                    }}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={editMutation.isPending}>
                    {editMutation.isPending ? "수정 중..." : "수정"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Results Dialog */}
      <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>AI 분석 결과</DialogTitle>
            <DialogDescription>
              리포트에 대한 AI 분석 결과를 확인하세요
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            {selectedAnalysis && (
              <>
                {/* Positive Points */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-semibold text-green-700">긍정적 평가 사항</h3>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="whitespace-pre-line text-sm text-green-800">
                      {selectedAnalysis.positivePoints || "분석 결과가 없습니다."}
                    </div>
                  </div>
                </div>

                {/* Concerns */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <h3 className="text-lg font-semibold text-red-700">우려사항</h3>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="whitespace-pre-line text-sm text-red-800">
                      {selectedAnalysis.concerns || "분석 결과가 없습니다."}
                    </div>
                  </div>
                </div>

                {/* Target Price */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-blue-700">평균 목표주가</h3>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800 font-medium">
                      {selectedAnalysis.averageTargetPrice || "목표주가 정보가 없습니다."}
                    </div>
                  </div>
                </div>

                {/* Analysis Status */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>분석 상태: {selectedAnalysis.analysisStatus === 'completed' ? '완료' : selectedAnalysis.analysisStatus}</span>
                    <span>
                      {selectedAnalysis.createdAt && 
                        `분석일: ${format(new Date(selectedAnalysis.createdAt), "yyyy-MM-dd HH:mm")}`
                      }
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              onClick={() => {
                setIsAnalysisOpen(false);
                setSelectedAnalysis(null);
              }}
            >
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}