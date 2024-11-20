import { Injectable } from '@nestjs/common';
import { FilesS3Service } from './s3.service';

@Injectable()
export class UploadService {
  constructor(private readonly filess3Service: FilesS3Service) {}

  async addAvatar(imageBuffer: Buffer, fileName: string) {
    return await this.filess3Service.uploadFile(imageBuffer, fileName);
  }
}
