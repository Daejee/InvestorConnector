import { Storage as GoogleCloudStorage } from '@google-cloud/storage';

export class ObjectStorageService {
  private storage: GoogleCloudStorage;
  private bucketName: string;

  constructor() {
    // For Replit Object Storage (Google Cloud Storage backend)
    this.storage = new GoogleCloudStorage();
    this.bucketName = process.env.REPLIT_BUCKET_NAME || 'repl-default-bucket';
  }

  async generateUploadUrl(filename: string): Promise<{ uploadURL: string; objectId: string }> {
    try {
      const objectId = `uploads/${Date.now()}-${filename}`;
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(objectId);

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType: 'application/octet-stream',
      });

      return {
        uploadURL: signedUrl,
        objectId: objectId
      };
    } catch (error) {
      console.error('Error generating upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  async getObjectUrl(objectPath: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(objectPath);

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      return signedUrl;
    } catch (error) {
      console.error('Error getting object URL:', error);
      throw new Error('Failed to get object URL');
    }
  }

  async deleteObject(objectPath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(objectPath);
      
      await file.delete();
      return true;
    } catch (error) {
      console.error('Error deleting object:', error);
      return false;
    }
  }
}