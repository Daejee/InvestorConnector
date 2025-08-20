import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 52428800, // 50MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const uppyRef = useRef<Uppy>();

  // Initialize Uppy instance
  useEffect(() => {
    if (!uppyRef.current) {
      uppyRef.current = new Uppy({
        restrictions: {
          maxNumberOfFiles,
          maxFileSize,
        },
        autoProceed: false,
      })
        .use(AwsS3, {
          shouldUseMultipart: false,
          getUploadParameters: onGetUploadParameters,
        })
        .on("complete", (result) => {
          try {
            onComplete?.(result);
          } catch (error) {
            console.error("Error in onComplete callback:", error);
          }
          // Close the modal after upload completion
          setShowModal(false);
          // Clear uploaded files from Uppy state
          setTimeout(() => {
            try {
              result.successful?.forEach(file => {
                if (file.id && uppyRef.current) {
                  uppyRef.current.removeFile(file.id);
                }
              });
              result.failed?.forEach(file => {
                if (file.id && uppyRef.current) {
                  uppyRef.current.removeFile(file.id);
                }
              });
            } catch (error) {
              console.error("Error clearing files:", error);
            }
          }, 100);
        })
        .on("error", (error) => {
          console.error("Uppy upload error:", error);
          setShowModal(false);
        })
        .on("upload-error", (file, error) => {
          console.error("Uppy file upload error:", file, error);
        });
    }

    return () => {
      if (uppyRef.current) {
        uppyRef.current.destroy();
        uppyRef.current = undefined;
      }
    };
  }, []); // Empty dependency array to prevent recreation

  if (!uppyRef.current) {
    return (
      <Button disabled className={buttonClassName}>
        {children}
      </Button>
    );
  }

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName}>
        {children}
      </Button>

      <DashboardModal
        uppy={uppyRef.current}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        closeAfterFinish={true}
      />
    </div>
  );
}