import { getS3Client } from '../../src/shared/s3.client';
import { S3Client } from '@aws-sdk/client-s3';

describe('getS3Client', () => {
  it('returns an S3Client instance', () => {
    expect(getS3Client()).toBeInstanceOf(S3Client);
  });

  it('returns the same instance on multiple calls', () => {
    expect(getS3Client()).toBe(getS3Client());
  });
});
