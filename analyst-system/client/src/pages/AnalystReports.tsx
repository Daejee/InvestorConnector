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
import { Search, Upload, Download, Trash2, FileText, Plus, Edit, Eye, Brain } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { AnalystReport, Analyst } from "../../../shared/schema";

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
  title: z.string().optional(),
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
      contentText: "",
      description: "",
      targetPrice: "",
      publishDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const editForm = useForm<UploadReportForm>({
    resolver: zodResolver(uploadReportSchema),
    defaultValues: {
      title: "",
      analystId: 0,
      contentText: "",
      description: "",
      targetPrice: "",
      publishDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: UploadReportForm & { file: File }) => {
      try {
        // Get upload URL
        const uploadRes = await apiRequest("/api/objects/upload", {
          method: "POST",
          body: { filename: data.file.name },
        });
        
        const uploadResponse = (await uploadRes.json()) as { uploadURL: string; objectId: string };
        
        if (!uploadResponse || !uploadResponse.uploadURL) {
          throw new Error("업로드 URL을 받지 못했습니다");
        }
        
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

        // Create analyst report record
        return apiRequest("/api/analyst-reports", {
          method: "POST",
          body: {
            title: data.title || data.file.name,
            analystId: data.analystId,
            originalFileName: data.file.name,
            filePath: uploadResponse.objectId,
            fileSize: data.file.size,
            fileType: data.file.type,
            contentText: data.contentText,
            description: data.description,
            targetPrice: data.targetPrice,
            publishDate: data.publishDate,
          },
        });
      } catch (error) {
        console.error("Upload error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyst-reports"] });
      toast({
        title: "업로드 완료",
        description: "애널리스트 리포트가 성공적으로 업로드되었습니다.",
      });
      setIsUploadOpen(false);
      form.reset();
      setSelectedFile(null);
    },
    onError: (error: any) => {
      console.error("업로드 실패:", error);
      toast({
        title: "업로드 실패",
        description: error.message || "리포트 업로드에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async (data: UploadReportForm & { id: number }) => {
      return apiRequest(`/api/analyst-reports/${data.id}`, {
        method: "PATCH",
        body: {
          title: data.title,
          analystId: data.analystId,
          contentText: data.contentText,
          description: data.description,
          targetPrice: data.targetPrice,
          publishDate: data.publishDate,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyst-reports"] });
      toast({
        title: "수정 완료",
        description: "리포트가 성공적으로 수정되었습니다.",
      });
      setIsEditOpen(false);
      setEditingReport(null);
    },
    onError: (error: any) => {
      toast({
        title: "수정 실패",
        description: error.message || "리포트 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/analyst-reports/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyst-reports"] });
      toast({
        title: "삭제 완료",
        description: "리포트가 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "리포트 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Comprehensive analysis mutation
  const comprehensiveAnalysisMutation = useMutation({
    mutationFn: async (reportIds: number[]) => {
      return apiRequest("/api/comprehensive-analysis", {
        method: "POST",
        body: { reportIds },
      });
    },
    onSuccess: (data) => {
      setComprehensiveResult(data);
      setIsGeneratingComprehensive(false);
      toast({
        title: "종합 분석 완료",
        description: "AI 종합 분석이 완료되었습니다.",
      });
    },
    onError: (error: any) => {
      setIsGeneratingComprehensive(false);
      toast({
        title: "분석 실패",
        description: error.message || "종합 분석에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (data: UploadReportForm) => {
    if (!selectedFile) {
      toast({
        title: "파일 선택 필요",
        description: "업로드할 PDF 파일을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({ ...data, file: selectedFile });
  };

  const handleEdit = (report: AnalystReport) => {
    setEditingReport(report);
    editForm.reset({
      title: report.title || "",
      analystId: report.analystId,
      contentText: report.contentText || "",
      description: report.description || "",
      targetPrice: report.targetPrice || "",
      publishDate: report.publishDate || format(new Date(), "yyyy-MM-dd"),
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = (data: UploadReportForm) => {
    if (!editingReport) return;
    editMutation.mutate({ ...data, id: editingReport.id });
  };

  const handleDelete = (id: number) => {
    if (confirm("이 리포트를 삭제하시겠습니까?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDetail = (report: AnalystReport) => {
    setViewingReport(report);
    setIsDetailOpen(true);
  };

  const handleReportSelection = (reportId: number, checked: boolean) => {
    if (checked) {
      setSelectedReportIds(prev => [...prev, reportId]);
    } else {
      setSelectedReportIds(prev => prev.filter(id => id !== reportId));
    }
  };

  const handleComprehensiveAnalysis = () => {
    if (selectedReportIds.length === 0) {
      toast({
        title: "리포트 선택 필요",
        description: "분석할 리포트를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingComprehensive(true);
    comprehensiveAnalysisMutation.mutate(selectedReportIds);
  };

  const filteredReports = reports.filter(report =>
    report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    analysts.find(a => a.id === report.analystId)?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    analysts.find(a => a.id === report.analystId)?.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">애널리스트 리포트</h1>
        
        <div className="flex items-center gap-4">
          {selectedReportIds.length > 0 && (
            <Button
              onClick={handleComprehensiveAnalysis}
              disabled={isGeneratingComprehensive}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Brain className="mr-2 h-4 w-4" />
              {isGeneratingComprehensive ? "분석 중..." : `종합 분석 (${selectedReportIds.length}개)`}
            </Button>
          )}
          
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                리포트 업로드
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>새 애널리스트 리포트 업로드</DialogTitle>
                <DialogDescription>
                  PDF 파일을 업로드하고 분석 데이터를 입력하세요.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFileUpload)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-sm font-medium">PDF 파일</label>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="mt-1"
                      />
                    </div>

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
                          <FormLabel>애널리스트</FormLabel>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(parseInt(value))}
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
                              type="number"
                              placeholder="85000"
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
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={uploadMutation.isPending || !selectedFile}
                      className="flex-1"
                    >
                      {uploadMutation.isPending ? "업로드 중..." : "업로드"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsUploadOpen(false)}
                    >
                      취소
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and filter */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="리포트 제목, 애널리스트명, 증권사로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Reports table */}
      <Card>
        <CardHeader>
          <CardTitle>애널리스트 리포트 목록</CardTitle>
          <CardDescription>
            업로드된 애널리스트 리포트와 분석 데이터를 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? "검색 결과가 없습니다." : "업로드된 리포트가 없습니다."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">선택</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead>애널리스트</TableHead>
                    <TableHead>증권사</TableHead>
                    <TableHead>발행일</TableHead>
                    <TableHead>목표주가</TableHead>
                    <TableHead className="text-center">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => {
                    const analyst = analysts.find(a => a.id === report.analystId);
                    return (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedReportIds.includes(report.id)}
                            onCheckedChange={(checked) => 
                              handleReportSelection(report.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {report.title || report.originalFileName}
                        </TableCell>
                        <TableCell>{analyst?.name || "알 수 없음"}</TableCell>
                        <TableCell>{analyst?.company || "알 수 없음"}</TableCell>
                        <TableCell>
                          {report.publishDate ? format(new Date(report.publishDate), 'yyyy-MM-dd') : '-'}
                        </TableCell>
                        <TableCell>
                          {report.targetPrice ? `${report.targetPrice}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(report)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(report)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(report.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comprehensive Analysis Modal */}
      {comprehensiveResult && (
        <Dialog open={isComprehensiveOpen} onOpenChange={setIsComprehensiveOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setIsComprehensiveOpen(true)}
              className="hidden"
            />
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI 종합 분석 결과</DialogTitle>
              <DialogDescription>
                선택한 {selectedReportIds.length}개 리포트의 종합 분석 결과입니다.
              </DialogDescription>
            </DialogHeader>
            
            <div id="comprehensive-analysis-content" className="space-y-6 p-4">
              {/* Summary Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
                  종합 요약
                </h2>
                <div className="bg-white p-4 rounded border">
                  <p className="text-gray-700 leading-relaxed">
                    {comprehensiveResult.summary}
                  </p>
                </div>
              </div>

              {/* Positive Points Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">2</span>
                  통합 긍정적 요인
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
                  평균목표주가 분석
                </h2>
                <div className="bg-white p-4 rounded border">
                  <p className="text-gray-700 leading-relaxed font-medium text-lg">
                    {comprehensiveResult.averageTargetPrice}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={() => setIsComprehensiveOpen(false)}
                variant="outline"
              >
                닫기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Show the modal automatically when result is available */}
      {comprehensiveResult && !isComprehensiveOpen && (
        <>
          {setIsComprehensiveOpen(true)}
        </>
      )}
    </div>
  );
}