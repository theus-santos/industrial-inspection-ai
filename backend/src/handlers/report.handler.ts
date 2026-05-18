import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '../shared/s3.client';
import { EquipmentRepo } from '../repositories/equipment.repo';
import { InspectionRepo } from '../repositories/inspection.repo';
import { PhotoRepo } from '../repositories/photo.repo';
import { PdfService } from '../services/pdf.service';

const TABLE = process.env.TABLE_NAME!;
const PDFS_BUCKET = process.env.PDFS_BUCKET!;
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET!;

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const inspectionId = event.pathParameters?.id;
  if (!inspectionId) return json(400, { message: 'inspectionId required' });

  const inspectionRepo = new InspectionRepo(TABLE);
  const equipmentRepo = new EquipmentRepo(TABLE);
  const photoRepo = new PhotoRepo(TABLE);
  const pdfService = new PdfService();

  try {
    const inspection = await inspectionRepo.findById(inspectionId);
    if (!inspection) return json(404, { message: 'Inspection not found' });

    const [equipment, checklist, photos] = await Promise.all([
      equipmentRepo.findById(inspection.equipmentId),
      inspectionRepo.getChecklist(inspectionId),
      photoRepo.listByInspection(inspectionId),
    ]);

    if (!equipment) return json(404, { message: 'Equipment not found' });

    const analyses = await Promise.all(photos.map(p => photoRepo.getAnalysis(p.id)));
    const validAnalyses = analyses.filter((a): a is NonNullable<typeof a> => a !== null);

    const photosWithUrls = await Promise.all(
      photos.map(async photo => {
        const url = await getSignedUrl(
          getS3Client(),
          new GetObjectCommand({ Bucket: PHOTOS_BUCKET, Key: photo.s3Key }),
          { expiresIn: 120 },
        );
        return {
          photo,
          url,
          analysis: validAnalyses.find(a => a.photoId === photo.id),
        };
      })
    );

    const pdfBuffer = await pdfService.generate({
      equipment,
      inspection,
      checklist,
      photos,
      analyses: validAnalyses,
      photosWithUrls,
    });

    const pdfKey = `reports/${inspectionId}.pdf`;
    await getS3Client().send(
      new PutObjectCommand({ Bucket: PDFS_BUCKET, Key: pdfKey, Body: pdfBuffer, ContentType: 'application/pdf' })
    );

    const downloadUrl = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: PDFS_BUCKET, Key: pdfKey }),
      { expiresIn: 3600 }
    );

    return json(200, { downloadUrl, pdfKey });
  } catch (err) {
    console.error(err);
    return json(500, { message: 'Internal server error' });
  }
}
