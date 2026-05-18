import { S3Client } from '@aws-sdk/client-s3';

let instance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!instance) {
    instance = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
  }
  return instance;
}
