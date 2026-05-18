import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '../shared/s3.client';
import { PhotoRepo } from '../repositories/photo.repo';
import { GeminiService } from '../services/gemini.service';
import { DefectAnalysis } from '../shared/types';

const TABLE = process.env.TABLE_NAME!;
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const photoId = event.pathParameters?.id;
  if (!photoId) return json(400, { message: 'photoId required' });

  const { inspectionId } = JSON.parse(event.body ?? '{}');
  if (!inspectionId) return json(400, { message: 'inspectionId required' });

  const repo = new PhotoRepo(TABLE);
  const gemini = new GeminiService(GEMINI_API_KEY);

  try {
    const photo = await repo.findById(photoId, inspectionId);
    if (!photo) return json(404, { message: 'Photo not found' });

    const imageUrl = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: PHOTOS_BUCKET, Key: photo.s3Key }),
      { expiresIn: 60 }
    );

    const { defects, summary } = await gemini.analyzeImage(imageUrl);

    const analysis: DefectAnalysis = {
      photoId,
      defects,
      summary,
      analyzedAt: new Date().toISOString(),
    };

    await repo.saveAnalysis(photoId, analysis);
    return json(200, analysis);
  } catch (err) {
    console.error(err);
    return json(500, { message: 'Internal server error' });
  }
}
