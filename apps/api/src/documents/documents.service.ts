/**
 * Documents Service
 *
 * Manages document storage, versioning, and access control.
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DocumentType, UserRole } from '@prisma/client';

export interface UploadDocumentDto {
  title: string;
  description?: string;
  type: DocumentType;
  categoryId?: string;
  userId?: string; // For employee-specific documents
  expiresAt?: Date;
  isConfidential?: boolean;
}

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /**
   * Upload a document
   */
  async uploadDocument(
    companyId: string,
    actorId: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto
  ) {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('Document title is required');
    }
    if (dto.description && dto.description.length > 10000) {
      throw new BadRequestException('Description cannot exceed 10000 characters');
    }
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const maxFileSize = 50 * 1024 * 1024;
    if (file.size > maxFileSize) {
      throw new BadRequestException('File size cannot exceed 50MB');
    }
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed');
    }

    // Upload to storage
    const uploadResult = await this.storage.uploadFile(
      file,
      `documents/${companyId}/${dto.type.toLowerCase()}`
    );

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        companyId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        categoryId: dto.categoryId,
        userId: dto.userId || actorId,
        fileUrl: uploadResult.url,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        uploadedBy: actorId,
        expiresAt: dto.expiresAt,
        isConfidential: dto.isConfidential || false,
        version: 1,
      },
    });

    return document;
  }

  /**
   * Get documents for company
   */
  async getDocuments(
    companyId: string,
    options: {
      type?: DocumentType;
      categoryId?: string;
      userId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 20;
    const { type, categoryId, userId, search } = options;

    const where: any = { companyId };
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (userId) where.userId = userId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          category: true,
          user: { include: { profile: true } },
          uploadedByUser: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string, companyId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, companyId },
      include: {
        category: true,
        user: { include: { profile: true } },
        uploadedByUser: { include: { profile: true } },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  /**
   * Get document download URL
   */
  async getDownloadUrl(documentId: string, companyId: string) {
    const document = await this.getDocument(documentId, companyId);
    const url = await this.storage.getDownloadUrl(document.fileUrl);
    return { url, document };
  }

  /**
   * Update document
   */
  async updateDocument(
    documentId: string,
    companyId: string,
    actorId: string,
    updates: Partial<UploadDocumentDto>
  ) {
    await this.getDocument(documentId, companyId);

    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        ...updates,
        updatedBy: actorId,
      },
    });
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, companyId: string) {
    const document = await this.getDocument(documentId, companyId);

    // Delete from storage
    await this.storage.deleteFile(document.fileUrl);

    // Delete record
    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return { deleted: true };
  }

  /**
   * Create document category
   */
  async createCategory(
    companyId: string,
    name: string,
    description?: string
  ) {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Category name is required');
    }
    return this.prisma.documentCategory.create({
      data: {
        companyId,
        name,
        description,
      },
    });
  }

  /**
   * Get document categories
   */
  async getCategories(companyId: string) {
    return this.prisma.documentCategory.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });
  }

  /**
   * Get document statistics
   */
  async getStats(companyId: string) {
    const [
      totalDocuments,
      byType,
      totalSize,
      expiringSoon,
    ] = await Promise.all([
      this.prisma.document.count({ where: { companyId } }),
      this.prisma.document.groupBy({
        by: ['type'],
        where: { companyId },
        _count: true,
      }),
      this.prisma.document.aggregate({
        where: { companyId },
        _sum: { fileSize: true },
      }),
      this.prisma.document.count({
        where: {
          companyId,
          expiresAt: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            gte: new Date(),
          },
        },
      }),
    ]);

    return {
      totalDocuments,
      byType,
      totalSize: totalSize._sum.fileSize || 0,
      expiringSoon,
    };
  }
}
