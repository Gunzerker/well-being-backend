import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import * as AWS from 'aws-sdk';
import { convertImage } from '../../shared/convertImage';
import { Stream } from 'stream';
import { v4 as uuidv4 } from 'uuid';


@Injectable()
export class FilesS3Service {
  constructor() {}

  public async uploadFile(imageBuffer: Buffer, fileName: string) {
    const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
    const s3 = new AWS.S3();
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.REGION,
    });
    const new_image_buffer = await convertImage(imageBuffer);
    return await s3
      .upload({
        Bucket: AWS_S3_BUCKET_NAME!,
        Body: new_image_buffer,
        Key: fileName,
        ACL: 'public-read',
        ContentType: 'image/jpeg',
      })
      .promise();
  }

  public async uploadPdfFile(fileBuffer: Buffer, fileName: string) {
    console.log('here pdf');
    const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
    const s3 = new AWS.S3();
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.REGION,
    });

    return await s3
      .upload({
        Bucket: AWS_S3_BUCKET_NAME!,
        Body: fileBuffer,
        Key: fileName,
        ACL: 'public-read',
        ContentType: 'application/pdf',
      })
      .promise();
  }

  public async uploadCsvFileStrem(fileName: string) {
    const fs = require('fs');
    var dir = './tmp/';

    console.log('here csv');
    const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
    const s3 = new AWS.S3();
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.REGION,
    });

    return await s3
      .upload({
        Bucket: AWS_S3_BUCKET_NAME!,
        Body: fs.createReadStream(dir + 'test.csv'),
        Key: fileName,
        ACL: 'public-read',
        ContentType: 'application/csv',
      })
      .promise();
  }

  public async uploadPdf(fileName: string) {
    const fs = require('fs');
    const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
    const s3 = new AWS.S3();
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.REGION,
    });

    return await s3
      .upload({
        Bucket: AWS_S3_BUCKET_NAME!,
        Body: fs.readFileSync(fileName),
        Key: uuidv4()+'.pdf',
        ACL: 'public-read',
        ContentType: 'application/pdf',
      })
      .promise();
  }

  public async uploadCsvFile(fileBuffer: Buffer, fileName: string) {
    console.log('here csv');
    const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
    const s3 = new AWS.S3();
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.REGION,
    });

    return await s3
      .upload({
        Bucket: AWS_S3_BUCKET_NAME!,
        Body: fileBuffer,
        Key: fileName,
        ACL: 'public-read',
        ContentType: 'application/csv',
      })
      .promise();
  }
  public async deleteFile(fileName: string) {
    const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.REGION,
    });
    const s3 = new S3();
    return await s3
      .deleteObject({
        Bucket: AWS_S3_BUCKET_NAME!,
        Key: fileName,
      })
      .promise();
  }
}
