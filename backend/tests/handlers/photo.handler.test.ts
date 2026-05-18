import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.presigned.url/photo.jpg'),
}));
jest.mock('../../src/shared/s3.client', () => ({ getS3Client: jest.fn() }));
jest.mock('../../src/repositories/photo.repo');

import { handler } from '../../src/handlers/photo.handler';
import { PhotoRepo } from '../../src/repositories/photo.repo';
const MockPhotoRepo = PhotoRepo as jest.MockedClass<typeof PhotoRepo>;

function makeEvent(method: string, body?: object): APIGatewayProxyEventV2 {
  return {
    requestContext: { http: { method } },
    rawPath: '/photos/presigned-url',
    body: body ? JSON.stringify(body) : undefined,
  } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => MockPhotoRepo.mockClear());

describe('GET /photos/presigned-url', () => {
  it('returns uploadUrl, photoId, s3Key', async () => {
    MockPhotoRepo.prototype.createPhotoRecord.mockResolvedValue({
      id: 'photo-1', inspectionId: 'ins-1', s3Key: 'photos/ins-1/photo-1.jpg', createdAt: '2026-01-01T00:00:00Z',
    });
    const event = makeEvent('GET', { inspectionId: 'ins-1', contentType: 'image/jpeg' });
    const res = await handler(event) as APIGatewayProxyStructuredResultV2;
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.uploadUrl).toBe('https://s3.presigned.url/photo.jpg');
    expect(body.photoId).toBe('photo-1');
    expect(body.s3Key).toBe('photos/ins-1/photo-1.jpg');
  });
});
