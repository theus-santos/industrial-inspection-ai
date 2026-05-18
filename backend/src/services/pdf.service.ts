import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { ChecklistItem, DefectAnalysis, Equipment, Inspection, Photo } from '../shared/types';

const EQUIPMENT_TYPE_LABEL: Record<string, string> = {
  maintenance: 'Manutencao', welding: 'Solda', structures: 'Estruturas', equipment: 'Equipamento Geral',
};

const DEFECT_LABEL: Record<string, string> = {
  crack: 'Rachadura', rust: 'Ferrugem', leak: 'Vazamento', wear: 'Desgaste',
  weld_failure: 'Falha de Solda', damaged_part: 'Peca Danificada',
  loose_bolt: 'Parafuso Solto', deformation: 'Deformacao', safety_risk: 'Risco de Seguranca',
};

const SEVERITY_LABEL: Record<string, string> = {
  low: 'Baixo', medium: 'Medio', high: 'Alto', critical: 'Critico',
};

const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

interface ReportInput {
  equipment: Equipment;
  inspection: Inspection;
  checklist: ChecklistItem[];
  photos: Photo[];
  analyses: DefectAnalysis[];
}

export class PdfService {
  async generate(input: ReportInput): Promise<Buffer> {
    const { equipment, inspection, checklist, analyses } = input;
    const failedItems = checklist.filter(i => !i.checked);
    const allDefects = analyses.flatMap(a => a.defects);
    const maxSeverity = allDefects.length > 0
      ? (['critical', 'high', 'medium', 'low'] as const).find(s => allDefects.some(d => d.severity === s)) ?? 'low'
      : 'N/A';

    const categories = [...new Set(checklist.map(i => i.category))];

    const checklistContent: Content[] = categories.flatMap(cat => [
      { text: cat, style: 'categoryHeader' } as Content,
      {
        ul: checklist
          .filter(i => i.category === cat)
          .map(i => ({ text: `${i.checked ? '[OK]' : '[REPROV]'} ${i.label}`, color: i.checked ? '#2e7d32' : '#c62828' })),
      } as Content,
    ]);

    const notesContent: Content[] = inspection.notes
      ? [{ text: `Observações: ${inspection.notes}`, italics: true }]
      : [];

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'RELATÓRIO DE INSPEÇÃO INDUSTRIAL', style: 'header' } as Content,
        { text: `Equipamento: ${equipment.name}`, style: 'subheader' } as Content,
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Tipo', EQUIPMENT_TYPE_LABEL[equipment.type] ?? equipment.type],
              ['Localização', equipment.location],
              ['Inspetor', inspection.inspector],
              ['Data', new Date(inspection.createdAt).toLocaleString('pt-BR')],
              ['Status', inspection.status === 'completed' ? 'Concluída' : 'Aberta'],
              ['ID da Inspeção', inspection.id],
            ],
          },
          margin: [0, 10, 0, 20] as [number, number, number, number],
        } as Content,
        { text: 'CHECKLIST DE INSPEÇÃO', style: 'sectionHeader' } as Content,
        ...checklistContent,
        { text: '\nRESUMO DE DEFEITOS', style: 'sectionHeader', margin: [0, 20, 0, 0] as [number, number, number, number] } as Content,
        {
          table: {
            widths: ['*', 'auto', 'auto', '*'],
            body: [
              ['Tipo', 'Severidade', 'Confianca', 'Localizacao'],
              ...allDefects.map(d => [
                DEFECT_LABEL[d.type] ?? d.type,
                SEVERITY_LABEL[d.severity] ?? d.severity,
                `${Math.round(d.confidence * 100)}%`,
                d.location,
              ]),
            ],
          },
        } as Content,
        {
          text: `\nSeveridade maxima: ${SEVERITY_LABEL[maxSeverity] ?? maxSeverity} | Total de defeitos: ${allDefects.length} | Itens reprovados: ${failedItems.length}`,
          margin: [0, 10, 0, 10] as [number, number, number, number],
        } as Content,
        ...notesContent,
        { text: `\nRelatório gerado em: ${new Date().toLocaleString('pt-BR')} | ID: ${inspection.id}`, fontSize: 8, color: '#757575', margin: [0, 30, 0, 0] as [number, number, number, number] } as Content,
      ],
      styles: {
        header: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 10] as [number, number, number, number] },
        subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
        sectionHeader: { fontSize: 13, bold: true, decoration: 'underline', margin: [0, 10, 0, 8] as [number, number, number, number] },
        categoryHeader: { fontSize: 11, bold: true, margin: [0, 6, 0, 3] as [number, number, number, number] },
      },
    };

    return new Promise((resolve, reject) => {
      const printer = new PdfPrinter(FONTS);
      const doc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }
}
