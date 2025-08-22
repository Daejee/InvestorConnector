import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
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
import { SimpleFileUploader } from "@/components/SimpleFileUploader";
import type { Document } from "@shared/schema";

// Category translation mapping
const getCategoryDisplayName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    "IR Presentations": "IR 발표자료",
    "Meeting Notes": "회의록",
    "Financial Reports": "재무자료",
    "Research Reports": "분석리포트",
    "Others": "기타",
    // Legacy categories for backward compatibility
    "General": "일반",
    "Legal Documents": "법적문서",
    "Research": "리서치",
    "Contracts": "계약서"
  };
  return categoryMap[category] || category;
};

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [uploadForm, setUploadForm] = useState({
    category: "General",
    description: ""
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });



  // Direct file upload handler for documents
  const handleDirectFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // File size validation (50MB limit)
    if (file.size > 52428800) {
      toast({
        title: "파일 크기 오류",
        description: "파일 크기는 50MB를 초과할 수 없습니다.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      console.log('Starting direct file upload for document:', file.name);
      
      // Step 1: Get pre-signed URL
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('업로드 URL 생성에 실패했습니다.');
      }

      const { uploadURL } = await uploadResponse.json();
      console.log('Got upload URL, uploading document file...');

      // Step 2: Upload file to pre-signed URL
      const uploadFileResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadFileResponse.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      console.log('File uploaded successfully, saving to database...');

      // Step 3: Save document info to database
      const response = await fetch("/api/documents/upload-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploadURL: uploadURL,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          category: uploadForm.category,
          description: uploadForm.description,
          uploadedBy: "User",
        })
      });
      
      if (!response.ok) throw new Error("Failed to save document");

      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      
      // Reset form and file input
      setUploadForm({
        category: "General",
        description: ""
      });
      event.target.value = '';
      setIsUploadDialogOpen(false);
      
      toast({
        title: "Document uploaded / 문서가 업로드되었습니다",
        description: "The document has been successfully uploaded / 문서가 성공적으로 업로드되었습니다",
      });
    } catch (error) {
      console.error("Failed to upload document:", error);
      toast({
        title: "Upload failed / 업로드 실패",
        description: `Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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

  // Handler functions for document actions
  const handleView = (document: Document) => {
    // Open document in new tab for viewing
    const cleanPath = document.filePath.startsWith('/objects') ? document.filePath : `/objects${document.filePath}`;
    window.open(cleanPath, '_blank');
  };

  const handleDownload = async (doc: Document) => {
    try {
      console.log('Starting download for document:', doc.name, 'FilePath:', doc.filePath);
      
      // Remove leading /objects if present to avoid duplication
      const cleanPath = doc.filePath.startsWith('/objects') ? doc.filePath : `/objects${doc.filePath}`;
      console.log('Clean download path:', cleanPath);
      
      const response = await fetch(cleanPath);
      if (!response.ok) {
        console.error('Download response not ok:', response.status, response.statusText);
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 100);
      
      toast({
        title: "Download started / 다운로드 시작",
        description: `Downloading ${doc.originalName} / ${doc.originalName} 다운로드 중`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed / 다운로드 실패",
        description: `Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
  };



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

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.hwp,.xls,.xlsx,.csv"
                        onChange={handleDirectFileUpload}
                        className="hidden"
                        id="document-file-input"
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById('document-file-input')?.click()}
                        disabled={isUploading}
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span>
                            {isUploading ? 'Uploading... / 업로드 중...' : 'Choose and Upload Document / 문서 선택 및 업로드'}
                          </span>
                        </div>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Category / 카테고리</Label>
                    <Select value={uploadForm.category} onValueChange={(value) => setUploadForm(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IR Presentations">IR Presentations</SelectItem>
                        <SelectItem value="Meeting Notes">회의록</SelectItem>
                        <SelectItem value="Financial Reports">재무자료</SelectItem>
                        <SelectItem value="Research Reports">분석리포트</SelectItem>
                        <SelectItem value="Others">기타</SelectItem>
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
            <div className="flex items-center gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category / 카테고리 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories / 전체 카테고리</SelectItem>
                  <SelectItem value="IR Presentations">IR Presentations</SelectItem>
                  <SelectItem value="Meeting Notes">회의록</SelectItem>
                  <SelectItem value="Financial Reports">재무자료</SelectItem>
                  <SelectItem value="Research Reports">분석리포트</SelectItem>
                  <SelectItem value="Others">기타</SelectItem>
                </SelectContent>
              </Select>
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
                    <TableCell>{getCategoryDisplayName(document.category || "")}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleView(document)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View / 보기
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(document)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download / 다운로드
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(document)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit / 편집
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm("정말 이 문서를 삭제하시겠습니까? / Are you sure you want to delete this document?")) {
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

      {/* Edit Document Dialog */}
      <Dialog open={!!editingDocument} onOpenChange={(open) => !open && setEditingDocument(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Document / 문서 편집</DialogTitle>
            <DialogDescription>
              Update document information / 문서 정보 수정
            </DialogDescription>
          </DialogHeader>
          {editingDocument && (
            <EditDocumentForm 
              document={editingDocument}
              onClose={() => setEditingDocument(null)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
                setEditingDocument(null);
                toast({
                  title: "Success",
                  description: "Document updated successfully / 문서가 성공적으로 업데이트되었습니다"
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* File Type Information */}
      <Alert className="mt-6">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Supported file types / 지원 파일 형식:</strong> PDF, DOC, DOCX, TXT, JPEG, PNG, HWP, Excel, CSV
          <br />
          <strong>Maximum file size / 최대 파일 크기:</strong> 50MB
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Edit Document Form Component
const editDocumentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string(),
  description: z.string().optional(),
});

type EditDocumentForm = z.infer<typeof editDocumentSchema>;

interface EditDocumentFormProps {
  document: Document;
  onClose: () => void;
  onSuccess: () => void;
}

function EditDocumentForm({ document, onClose, onSuccess }: EditDocumentFormProps) {
  const { toast } = useToast();
  
  const form = useForm<EditDocumentForm>({
    resolver: zodResolver(editDocumentSchema),
    defaultValues: {
      name: document.name,
      category: document.category || "General",
      description: document.description || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditDocumentForm) => {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update document");
      return response.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update document: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: EditDocumentForm) => {
    updateMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Name / 문서명</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Document name" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category / 카테고리</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="IR Presentations">IR Presentations</SelectItem>
                  <SelectItem value="Meeting Notes">회의록</SelectItem>
                  <SelectItem value="Financial Reports">재무자료</SelectItem>
                  <SelectItem value="Research Reports">분석리포트</SelectItem>
                  <SelectItem value="Others">기타</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description / 설명</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Document description" rows={3} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex space-x-2 pt-4">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes / 저장"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel / 취소
          </Button>
        </div>
      </form>
    </Form>
  );
}
