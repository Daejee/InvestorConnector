import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Upload, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface SimpleFileUploaderProps {
  onUploadComplete: (file: { name: string; size: number; url: string }) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function SimpleFileUploader({ 
  onUploadComplete, 
  disabled = false, 
  children 
}: SimpleFileUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10485760) { // 10MB limit
        toast({
          title: "파일 크기 오류",
          description: "파일 크기는 10MB를 초과할 수 없습니다.",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      console.log('Starting file upload:', selectedFile.name);
      
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
      setUploadProgress(30);
      console.log('Got upload URL, uploading file...');

      // Step 2: Upload file to pre-signed URL
      const uploadFileResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!uploadFileResponse.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      setUploadProgress(60);
      console.log('File uploaded successfully, processing...');

      // Step 3: Complete upload callback
      try {
        await onUploadComplete({
          name: selectedFile.name,
          size: selectedFile.size,
          url: uploadURL,
        });
        console.log('Upload completion callback successful');
      } catch (callbackError) {
        console.error('Callback error:', callbackError);
        throw callbackError;
      }

      setUploadProgress(100);
      
      // Add a small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // Clean up
      setSelectedFile(null);
      setShowModal(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setShowModal(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button 
        onClick={() => setShowModal(true)} 
        disabled={disabled}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>파일 업로드 / File Upload</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {!selectedFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-4">
                  파일을 선택하거나 드래그하여 업로드하세요
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  파일 선택
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedFile(null)}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-xs text-center text-gray-500">
                      업로드 중... {uploadProgress}%
                    </p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1"
                  >
                    {uploading ? "업로드 중..." : "업로드"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={uploading}
                  >
                    취소
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}