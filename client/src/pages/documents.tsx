import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Upload, Download, Eye, Search, Trash2, Edit, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import type { Document, Investor, Company } from "@shared/schema";

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    category: "General",
    description: "",
    investorId: "",
    companyId: "",
    tags: ""
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: investors = [] } = useQuery<Investor[]>({
    queryKey: ["/api/investors"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Document upload handlers for ObjectUploader
  const handleGetUploadParameters = async () => {
    try {
      setIsUploading(true);
      const response = await apiRequest("POST", "/api/objects/upload", {});
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      setIsUploading(false);
      console.error("Failed to get upload URL:", error);
      throw error;
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    setIsUploading(false);
    
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      
      try {
        await apiRequest("POST", "/api/documents/upload", {
          uploadURL: uploadedFile.uploadURL,
          fileName: uploadedFile.name,
          fileSize: uploadedFile.size,
          fileType: uploadedFile.type,
          category: uploadForm.category,
          description: uploadForm.description,
          uploadedBy: "User",
          tags: uploadForm.tags,
        });

        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        
        // Reset form
        setUploadForm({
          category: "General",
          description: "",
          investorId: "",
          companyId: "",
          tags: ""
        });
        setIsUploadDialogOpen(false);
        
        toast({
          title: "Document uploaded / 문서가 업로드되었습니다",
          description: "The document has been successfully uploaded / 문서가 성공적으로 업로드되었습니다",
        });
      } catch (error) {
        console.error("Failed to save document:", error);
        toast({
          title: "Upload failed / 업로드 실패",
          description: "Failed to save document information / 문서 정보 저장에 실패했습니다",
          variant: "destructive",
        });
      }
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });



  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileTypeColor = (fileType: string) => {
    if (fileType.includes("pdf")) return "bg-red-100 text-red-800";
    if (fileType.includes("word") || fileType.includes("document")) return "bg-blue-100 text-blue-800";
    if (fileType.includes("image")) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Documents / 문서</h2>
            <p className="text-gray-600 mt-1">Manage investor documents and attachments / 투자자 문서 및 첨부파일 관리</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document / 문서 업로드
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Document / 문서 업로드</DialogTitle>
                  <DialogDescription>
                    Upload a new document to the system / 시스템에 새 문서를 업로드합니다
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>File Upload / 파일 업로드</Label>
                    <div className="mt-1">
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={52428800} // 50MB
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleUploadComplete}
                        buttonClassName="w-full"
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span>Choose and Upload Document / 문서 선택 및 업로드</span>
                        </div>
                      </ObjectUploader>
                    </div>
                  </div>

                  <div>
                    <Label>Category / 카테고리</Label>
                    <Select value={uploadForm.category} onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General / 일반</SelectItem>
                        <SelectItem value="Financial Reports">Financial Reports / 재무보고서</SelectItem>
                        <SelectItem value="Presentations">Presentations / 발표자료</SelectItem>
                        <SelectItem value="Legal Documents">Legal Documents / 법적문서</SelectItem>
                        <SelectItem value="Meeting Notes">Meeting Notes / 회의록</SelectItem>
                        <SelectItem value="Research">Research / 리서치</SelectItem>
                        <SelectItem value="Contracts">Contracts / 계약서</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Description / 설명</Label>
                    <Textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Document description / 문서 설명"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Link to Investor / 투자자 연결 (Optional)</Label>
                    <Select value={uploadForm.investorId} onValueChange={(value) => setUploadForm(prev => ({ ...prev, investorId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select investor / 투자자 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {investors.map((investor) => (
                          <SelectItem key={investor.id} value={investor.id.toString()}>
                            {investor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Link to Company / 회사 연결 (Optional)</Label>
                    <Select value={uploadForm.companyId} onValueChange={(value) => setUploadForm(prev => ({ ...prev, companyId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company / 회사 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tags / 태그 (Optional)</Label>
                    <Input
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>

                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-500">
                      Fill in the metadata above, then use the upload button to select and upload your file
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      메타데이터를 입력한 후 업로드 버튼을 클릭해 파일을 선택하고 업로드하세요
                    </p>
                    {isUploading && (
                      <p className="text-sm text-blue-600 mt-2">
                        Uploading file... / 파일 업로드 중...
                      </p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Document Library / 문서 라이브러리</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search documents... / 문서 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8">Loading documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? "Try adjusting your search terms" : "Get started by uploading your first document"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / 이름</TableHead>
                  <TableHead>Type / 유형</TableHead>
                  <TableHead>Category / 카테고리</TableHead>
                  <TableHead>Size / 크기</TableHead>
                  <TableHead>Uploaded / 업로드일</TableHead>
                  <TableHead className="w-[100px]">Actions / 작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">{document.name}</p>
                          <p className="text-sm text-gray-500">{document.originalName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getFileTypeColor(document.fileType)}>
                        {document.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                      </Badge>
                    </TableCell>
                    <TableCell>{document.category}</TableCell>
                    <TableCell>{formatFileSize(document.fileSize)}</TableCell>
                    <TableCell>
                      {new Date(document.createdAt!).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View / 보기
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download / 다운로드
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit / 편집
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this document?")) {
                                deleteMutation.mutate(document.id);
                              }
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete / 삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* File Type Information */}
      <Alert className="mt-6">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Supported file types / 지원 파일 형식:</strong> PDF, DOC, DOCX, TXT, JPEG, PNG
          <br />
          <strong>Maximum file size / 최대 파일 크기:</strong> 10MB
        </AlertDescription>
      </Alert>
    </div>
  );
}
