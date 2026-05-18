import { PdfService } from '../../src/services/pdf.service';
import { Equipment, Inspection, ChecklistItem, Photo, DefectAnalysis } from '../../src/shared/types';

describe('PdfService.generate', () => {
  const equipment: Equipment = { id: 'eq-1', name: 'Compressor A', type: 'maintenance', location: 'Sala 1', createdAt: '2026-01-01T00:00:00Z' };
  const inspection: Inspection = { id: 'ins-1', equipmentId: 'eq-1', inspector: 'João Silva', notes: 'Inspeção rotineira.', status: 'completed', createdAt: '2026-01-01T10:00:00Z' };
  const checklist: ChecklistItem[] = [
    { id: 'ci-1', inspectionId: 'ins-1', label: 'Nível de óleo adequado', category: 'Lubrificação', checked: true },
    { id: 'ci-2', inspectionId: 'ins-1', label: 'Vibração dentro do normal', category: 'Vibrações', checked: false },
  ];
  const photos: Photo[] = [{ id: 'photo-1', inspectionId: 'ins-1', s3Key: 'photos/ins-1/photo-1.jpg', createdAt: '2026-01-01T10:05:00Z' }];
  const analyses: DefectAnalysis[] = [{ photoId: 'photo-1', defects: [{ type: 'rust', severity: 'medium', confidence: 0.87, location: 'bottom' }], summary: 'Rust detected.', analyzedAt: '2026-01-01T10:06:00Z' }];

  it('returns a Buffer (PDF binary)', async () => {
    const service = new PdfService();
    const buffer = await service.generate({ equipment, inspection, checklist, photos, analyses });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('PDF starts with %PDF header', async () => {
    const service = new PdfService();
    const buffer = await service.generate({ equipment, inspection, checklist, photos, analyses });
    expect(buffer.toString('ascii', 0, 4)).toBe('%PDF');
  });
});
