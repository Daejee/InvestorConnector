import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Search, Upload, Download, Trash2, FileText, Plus, Edit, ChevronDown, ChevronUp, Eye, Brain } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { AnalystReport, Analyst, AnalystReportAnalysis } from "@/../../shared/schema";

interface ComprehensiveAnalysisResult {
  summary: string;
  consolidatedPositivePoints: string;
  consolidatedConcerns: string;
  averageTargetPrice: string;
  reportTitles: string[];
  analysisDate: string;
}

// Form validation schema
const uploadReportSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  analystId: z.number().min(1, "애널리스트를 선택해주세요"),
  contentText: z.string().optional(),
  description: z.string().optional(),
  targetPrice: z.string().optional(),
  publishDate: z.string().min(1, "발행일을 선택해주세요"),
});

type UploadReportForm = z.infer<typeof uploadReportSchema>;

export default function AnalystReports() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingReport, setEditingReport] = useState<AnalystReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState<AnalystReport | null>(null);
  const [isComprehensiveOpen, setIsComprehensiveOpen] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [comprehensiveResult, setComprehensiveResult] = useState<ComprehensiveAnalysisResult | null>(null);
  const [isGeneratingComprehensive, setIsGeneratingComprehensive] = useState(false);
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
      positivePoints: "",
      concerns: "",
      targetPrice: "",
      publishDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const editForm = useForm<UploadReportForm>({
    resolver: zodResolver(uploadReportSchema),
    defaultValues: {
      title: "",
      analystId: 0,
      positivePoints: "",
      concerns: "",
      targetPrice: "",
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
    
    // Map the form fields to the correct database fields
    const mappedData = {
      title: data.title,
      analystId: data.analystId,
      targetPrice: data.targetPrice,
      contentText: data.contentText,
      description: data.description,
      publishDate: data.publishDate,
      file: selectedFile
    };
    
    uploadMutation.mutate(mappedData);
  };

  const handleEdit = (report: AnalystReport) => {
    setEditingReport(report);
    editForm.reset({
      title: report.title,
      analystId: report.analystId,
      contentText: report.contentText || "",
      description: report.description || "",
      targetPrice: report.targetPrice || "",
      publishDate: report.publishDate,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = (data: UploadReportForm) => {
    if (!editingReport) return;
    // Map the form fields to the correct database fields
    const mappedData = {
      id: editingReport.id,
      title: data.title,
      analystId: data.analystId,
      targetPrice: data.targetPrice,
      contentText: data.contentText,
      description: data.description,
      publishDate: data.publishDate,
    };
    editMutation.mutate(mappedData);
  };

  const handleViewDetail = (report: AnalystReport) => {
    setViewingReport(report);
    setIsDetailOpen(true);
  };



  const handleDownload = (report: AnalystReport) => {
    // Create download link using the server's objects endpoint
    if (report.filePath && report.filePath.startsWith('https://storage.googleapis.com/')) {
      // Extract the object path from the Google Cloud Storage URL
      const url = new URL(report.filePath);
      const pathParts = url.pathname.split('/.private/uploads/');
      if (pathParts.length === 2) {
        const objectId = pathParts[1];
        const downloadUrl = `/objects/uploads/${objectId}`;
        window.open(downloadUrl, '_blank');
      } else {
        toast({
          title: "다운로드 실패",
          description: "파일 경로를 분석할 수 없습니다.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "다운로드 실패", 
        description: "파일 경로가 올바르지 않습니다.",
        variant: "destructive",
      });
    }
  };

  const getAnalystName = (analystId: number) => {
    const analyst = analysts.find((a) => a.id === analystId);
    return analyst ? analyst.name : "Unknown";
  };

  const getAnalystCompany = (analystId: number) => {
    const analyst = analysts.find((a) => a.id === analystId);
    return analyst ? analyst.company : "Unknown";
  };

  // Comprehensive analysis functions
  const handleComprehensiveAnalysis = async () => {
    if (selectedReportIds.length === 0) {
      toast({
        title: "리포트를 선택하세요",
        description: "종합 분석을 위해 최소 1개 이상의 리포트를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingComprehensive(true);
    try {
      const response = await apiRequest("/api/comprehensive-analysis", {
        method: "POST",
        body: { reportIds: selectedReportIds },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "종합 분석에 실패했습니다");
      }

      const result = await response.json();
      setComprehensiveResult(result);
      setIsComprehensiveOpen(true);
      
      toast({
        title: "종합 분석 완료",
        description: `${selectedReportIds.length}개 리포트의 종합 분석이 완료되었습니다.`,
      });
    } catch (error) {
      console.error("Comprehensive analysis error:", error);
      toast({
        title: "종합 분석 실패",
        description: error instanceof Error ? error.message : "종합 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingComprehensive(false);
    }
  };

  const handleSelectAllReports = () => {
    if (selectedReportIds.length === reports.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(reports.map(r => r.id));
    }
  };

  const handleReportSelection = (reportId: number) => {
    setSelectedReportIds(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const exportToPDF = async () => {
    if (!comprehensiveResult) return;

    const element = document.getElementById('comprehensive-report');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`종합분석보고서_${comprehensiveResult.analysisDate}.pdf`);
      
      toast({
        title: "PDF 내보내기 완료",
        description: "종합 분석 보고서가 PDF로 저장되었습니다.",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "PDF 내보내기 실패",
        description: "PDF 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
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
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleComprehensiveAnalysis}
                disabled={isGeneratingComprehensive}
                className="relative"
              >
                <FileText className="h-4 w-4 mr-2" />
                {isGeneratingComprehensive ? "분석 중..." : "종합 분석 보고서"}
                {selectedReportIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-blue-600 text-white">
                    {selectedReportIds.length}
                  </Badge>
                )}
              </Button>
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
                                  {analysts
                                    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
                                    .map((analyst) => (
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
                          name="targetPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>목표주가</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="예: 85,000원"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contentText"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>긍정적 요인</FormLabel>
                              <FormControl>
                                <textarea
                                  placeholder="투자 매력도, 성장 가능성, 긍정적 요인 등을 입력하세요"
                                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>우려사항</FormLabel>
                              <FormControl>
                                <textarea
                                  placeholder="리스크 요인, 우려사항, 주의점 등을 입력하세요"
                                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            </div>
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

          {/* Data Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedReportIds.length > 0 && selectedReportIds.length === reports.length}
                      onCheckedChange={handleSelectAllReports}
                      aria-label="전체 선택"
                    />
                  </TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>애널리스트</TableHead>
                  <TableHead>증권사</TableHead>
                  <TableHead>발행일</TableHead>
                  <TableHead>목표주가</TableHead>
                  <TableHead className="text-center">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      리포트가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedReportIds.includes(report.id)}
                          onCheckedChange={() => handleReportSelection(report.id)}
                          aria-label={`리포트 선택: ${report.title}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-[300px] truncate">
                          {report.title}
                        </div>
                        {report.description && (
                          <div className="text-sm text-gray-500 max-w-[300px] truncate">
                            {report.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getAnalystName(report.analystId)}</TableCell>
                      <TableCell>{getAnalystCompany(report.analystId)}</TableCell>
                      <TableCell>
                        {format(new Date(report.publishDate), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {report.targetPrice || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(report)}
                            title="상세보기"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                          {analysts
                            .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
                            .map((analyst) => (
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
                  name="targetPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>목표주가</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="예: 85,000원"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="contentText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>긍정적 요인</FormLabel>
                      <FormControl>
                        <textarea
                          placeholder="투자 매력도, 성장 가능성, 긍정적 요인 등을 입력하세요"
                          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>우려사항</FormLabel>
                      <FormControl>
                        <textarea
                          placeholder="리스크 요인, 우려사항, 주의점 등을 입력하세요"
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Detail View Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>리포트 상세보기</DialogTitle>
            <DialogDescription>
              애널리스트 리포트의 상세 정보를 확인하세요
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            {viewingReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">리포트 제목</h3>
                    <p className="text-sm text-gray-700">{viewingReport.title}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">애널리스트</h3>
                    <p className="text-sm text-gray-700">
                      {getAnalystName(viewingReport.analystId)} - {getAnalystCompany(viewingReport.analystId)}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">발행일</h3>
                    <p className="text-sm text-gray-700">
                      {format(new Date(viewingReport.publishDate), "yyyy-MM-dd")}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">목표주가</h3>
                    <p className="text-sm text-gray-700 font-medium">
                      {viewingReport.targetPrice || "설정되지 않음"}
                    </p>
                  </div>
                </div>

                {viewingReport.contentText && (
                  <div>
                    <h3 className="font-semibold mb-2">긍정적 요인</h3>
                    <div className="bg-green-50 p-4 rounded-md border border-green-200">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {viewingReport.contentText}
                      </p>
                    </div>
                  </div>
                )}

                {viewingReport.description && (
                  <div>
                    <h3 className="font-semibold mb-2">우려사항</h3>
                    <div className="bg-red-50 p-4 rounded-md border border-red-200">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {viewingReport.description}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(viewingReport)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    파일 다운로드
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleEdit(viewingReport);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    편집
                  </Button>
                  <Button
                    onClick={() => {
                      setIsDetailOpen(false);
                      setViewingReport(null);
                    }}
                  >
                    닫기
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Comprehensive Analysis Dialog */}
      <Dialog open={isComprehensiveOpen} onOpenChange={setIsComprehensiveOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>종합 분석 보고서</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToPDF}
                  disabled={!comprehensiveResult}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF 내보내기
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              선택한 {selectedReportIds.length}개 리포트의 종합 분석 결과입니다
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {comprehensiveResult ? (
              <div id="comprehensive-report" className="space-y-6 p-6 bg-white">
                {/* Report Header */}
                <div className="text-center border-b pb-4">
                  <h1 className="text-2xl font-bold text-blue-800 mb-2">애널리스트 리포트 종합 분석</h1>
                  <p className="text-gray-600">Analysis Report</p>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded">
                      <span className="font-semibold">분석 일자:</span> {comprehensiveResult.analysisDate}
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <span className="font-semibold">분석 대상:</span> {comprehensiveResult.reportTitles.length}개 리포트
                    </div>
                  </div>
                </div>

                {/* Analysis Sections */}
                <div className="space-y-6">
                  {/* Summary Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
                      종합 요약
                    </h2>
                    <div className="bg-white p-4 rounded border">
                      <p className="text-gray-700 leading-relaxed">{comprehensiveResult.summary}</p>
                    </div>
                  </div>

                  {/* Positive Points Section */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">2</span>
                      통합 긍정 요인
                    </h2>
                    <div className="bg-white p-4 rounded border">
                      <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {comprehensiveResult.consolidatedPositivePoints}
                      </div>
                    </div>
                  </div>

                  {/* Concerns Section */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
                      <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">3</span>
                      통합 우려사항
                    </h2>
                    <div className="bg-white p-4 rounded border">
                      <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {comprehensiveResult.consolidatedConcerns}
                      </div>
                    </div>
                  </div>

                  {/* Target Price Section */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">4</span>
                      목표주가 분석
                    </h2>
                    <div className="bg-white p-4 rounded border">
                      <p className="text-gray-700 leading-relaxed font-medium text-lg">
                        {comprehensiveResult.averageTargetPrice}
                      </p>
                    </div>
                  </div>

                  {/* Report List Section */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="bg-gray-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">5</span>
                      분석 대상 리포트
                    </h2>
                    <div className="bg-white p-4 rounded border">
                      <ul className="space-y-2">
                        {comprehensiveResult.reportTitles.map((title, index) => (
                          <li key={index} className="flex items-center text-gray-700">
                            <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs mr-3">
                              {index + 1}
                            </span>
                            {title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center pt-6 border-t text-sm text-gray-500">
                  <p>IR CRM 시스템에서 생성된 종합 분석 보고서</p>
                </div>
              </div>
            ) : isGeneratingComprehensive ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Brain className="h-12 w-12 text-blue-600 animate-pulse mb-4" />
                <p className="text-lg text-gray-600">종합 분석을 생성하고 있습니다...</p>
                <p className="text-sm text-gray-500 mt-2">선택한 {selectedReportIds.length}개 리포트를 분석 중입니다</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg text-gray-600">분석 결과가 없습니다</p>
                <p className="text-sm text-gray-500 mt-2">리포트를 선택하고 종합 분석을 실행하세요</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}