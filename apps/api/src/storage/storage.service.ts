/**
 * Storage Service - MinIO S3-compatible storage operations
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000')),
      useSSL: this.configService.get('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY', 'satcom_minio'),
      secretKey: this.configService.get('MINIO_SECRET_KEY', 'satcom_minio_secret'),
    });
    this.bucket = this.configService.get('MINIO_BUCKET', 'satcom-files');
  }

  async onModuleInit() {
    // Ensure bucket exists
    try {
      const exists = await this.minioClient.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucket);
        console.log(`Created bucket: ${this.bucket}`);
      }
    } catch (error) {
      console.error('Failed to initialize MinIO bucket:', error);
    }
  }

  /**
   * Generate presigned URL for file upload
   */
  async getUploadUrl(folder: string, fileName: string, contentType: string): Promise<{ uploadUrl: string; objectKey: string }> {
    const extension = fileName.split('.').pop();
    const objectKey = `${folder}/${uuidv4()}.${extension}`;

    const uploadUrl = await this.minioClient.presignedPutObject(
      this.bucket,
      objectKey,
      15 * 60, // 15 minutes expiry
    );

    return { uploadUrl, objectKey };
  }

  /**
   * Generate presigned URL for file download
   */
  async getDownloadUrl(objectKey: string): Promise<string> {
    return this.minioClient.presignedGetObject(
      this.bucket,
      objectKey,
      60 * 60, // 1 hour expiry
    );
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(objectKey: string): Promise<void> {
    await this.minioClient.removeObject(this.bucket, objectKey);
  }

  /**
   * Get file metadata
   */
  async getFileInfo(objectKey: string): Promise<Minio.BucketItemStat> {
    return this.minioClient.statObject(this.bucket, objectKey);
  }
}
