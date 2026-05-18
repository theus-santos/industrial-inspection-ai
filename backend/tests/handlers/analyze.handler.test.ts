import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

jest.mock('../../src/services/gemini.service');
jest.mock('../../src/repositories/photo.repo');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.presigned.url/photo.jpg'),
}));
jest.mock('../../src/shared/s3.client', () => ({ getS3Client: jest.fn() }));

import { handler } from '../../src/handlers/analyze.handler';
import { GeminiService } from '../../src/services/gemini.service';
import { PhotoRepo } from '../../src/repositories/photo.repo';

const MockGemini = GeminiService as jest.MockedClass<typeof GeminiService>;
const MockPhotoRepo = PhotoRepo as jest.MockedClass<typeof PhotoRepo>;

function makeEvent(photoId: string, inspectionId: string): APIGatewayProxyEventV2 {
  return {
    requestContext: { http: { method: 'POST' } },
    rawPath: `/photos/${photoId}/analyze`,
    pathParameters: { id: photoId },
    body: JSON.stringify({ inspectionId }),
  } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => { MockGemini.mockClear(); MockPhotoRepo.mockClear(); });

describe('POST /photos/{id}/analyze', () => {
  it('analyzes photo and returns defects', async () => {
    const photo = { id: 'photo-1', inspectionId: 'ins-1', s3Key: 'photos/ins-1/photo-1.jpg', createdAt: '2026-01-01T00:00:00Z' };
    const analysis = { defects: [{ type: 'rust' as const, severity: 'medium' as const, confidence: 0.9, location: 'left' }], summary: 'Rust found.' };
    MockPhotoRepo.prototype.findById.mockResolvedValue(photo);
    MockGemini.prototype.analyzeImage.mockResolvedValue(analysis);
    MockPhotoRepo.prototype.saveAnalysis.mockResolvedValue(undefined);

    const res = await handler(makeEvent('photo-1', 'ins-1')) as APIGatewayProxyStructuredResultV2;
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.defects).toHaveLength(1);
    expect(body.defects[0].type).toBe('rust');
  });
});
