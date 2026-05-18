import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '../shared/s3.client';
import { PhotoRepo } from '../repositories/photo.repo';

const TABLE = process.env.TABLE_NAME!;
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET!;

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const repo = new PhotoRepo(TABLE);

  try {
    const inspectionId = event.queryStringParameters?.['inspectionId'];
    const contentType = event.queryStringParameters?.['contentType'] ?? 'image/jpeg';

    if (!inspectionId) return json(400, { message: 'inspectionId required' });

    const photo = await repo.createPhotoRecord({ inspectionId, s3Key: `photos/${inspectionId}/tmp` });
    const s3Key = `photos/${inspectionId}/${photo.id}.jpg`;

    const uploadUrl = await getSignedUrl(
      getS3Client(),
      new PutObjectCommand({ Bucket: PHOTOS_BUCKET, Key: s3Key, ContentType: contentType }),
      { expiresIn: 300 }
    );

    return json(200, { uploadUrl, photoId: photo.id, s3Key });
  } catch (err) {
    console.error(err);
    return json(500, { message: 'Internal server error' });
  }
}
