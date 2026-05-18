import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

jest.mock('../../src/repositories/equipment.repo');
jest.mock('../../src/repositories/inspection.repo');
jest.mock('../../src/repositories/photo.repo');
jest.mock('../../src/services/pdf.service');
jest.mock('@aws-sdk/client-s3');
jest.mock('../../src/shared/s3.client', () => ({ getS3Client: jest.fn().mockReturnValue({ send: jest.fn().mockResolvedValue({}) }) }));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/report.pdf'),
}));

import { handler } from '../../src/handlers/report.handler';
import { EquipmentRepo } from '../../src/repositories/equipment.repo';
import { InspectionRepo } from '../../src/repositories/inspection.repo';
import { PhotoRepo } from '../../src/repositories/photo.repo';
import { PdfService } from '../../src/services/pdf.service';

const equipment = { id: 'eq-1', name: 'Comp A', type: 'maintenance' as const, location: 'L', createdAt: '2026-01-01T00:00:00Z' };
const inspection = { id: 'ins-1', equipmentId: 'eq-1', inspector: 'João', notes: '', status: 'open' as const, createdAt: '2026-01-01T00:00:00Z' };

beforeEach(() => {
  (EquipmentRepo as jest.MockedClass<typeof EquipmentRepo>).mockClear();
  (InspectionRepo as jest.MockedClass<typeof InspectionRepo>).mockClear();
  (InspectionRepo as jest.MockedClass<typeof InspectionRepo>).prototype.findById.mockResolvedValue(inspection);
  (EquipmentRepo as jest.MockedClass<typeof EquipmentRepo>).prototype.findById.mockResolvedValue(equipment);
  (InspectionRepo as jest.MockedClass<typeof InspectionRepo>).prototype.getChecklist.mockResolvedValue([]);
  (PhotoRepo as jest.MockedClass<typeof PhotoRepo>).prototype.listByInspection.mockResolvedValue([]);
  (PhotoRepo as jest.MockedClass<typeof PhotoRepo>).prototype.getAnalysis.mockResolvedValue(null);
  (PdfService as jest.MockedClass<typeof PdfService>).prototype.generate.mockResolvedValue(Buffer.from('%PDF-1.4'));
});

describe('POST /inspections/{id}/report', () => {
  it('returns 200 with downloadUrl', async () => {
    const event = {
      requestContext: { http: { method: 'POST' } },
      rawPath: '/inspections/ins-1/report',
      pathParameters: { id: 'ins-1' },
      body: undefined,
    } as unknown as APIGatewayProxyEventV2;

    const res = await handler(event) as APIGatewayProxyStructuredResultV2;
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.downloadUrl).toBe('https://s3.example.com/report.pdf');
  });
});
