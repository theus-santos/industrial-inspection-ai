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

const SEVERITY_COLOR_PDF: Record<string, string> = {
  low: '#2e7d32', medium: '#e65100', high: '#c62828', critical: '#b71c1c',
};

const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

interface PhotoWithUrl {
  photo: Photo;
  url: string;
  analysis: DefectAnalysis | undefined;
}

interface ReportInput {
  equipment: Equipment;
  inspection: Inspection;
  checklist: ChecklistItem[];
  photos: Photo[];
  analyses: DefectAnalysis[];
  photosWithUrls: PhotoWithUrl[];
}

export class PdfService {
  async generate(input: ReportInput): Promise<Buffer> {
    const { equipment, inspection, checklist, analyses, photosWithUrls } = input;
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
      ? [{ text: `Observacoes: ${inspection.notes}`, italics: true }]
      : [];

    const imagesData = await this.fetchImagesAsBase64(photosWithUrls);

    const photoContent: Content[] = photosWithUrls.length > 0
      ? [
          { text: '\nREGISTRO FOTOGRAFICO', style: 'sectionHeader', margin: [0, 20, 0, 8] as [number, number, number, number] } as Content,
          ...imagesData.map(({ idx, data, mimeType }) => {
            const pw = photosWithUrls[idx];
            const defects = pw.analysis?.defects ?? [];
            const summary = pw.analysis?.summary ?? '';
            const defectStack: Content[] = defects.length > 0
              ? defects.map(d => ({
                  text: `${DEFECT_LABEL[d.type] ?? d.type} - ${SEVERITY_LABEL[d.severity] ?? d.severity}`,
                  color: SEVERITY_COLOR_PDF[d.severity] ?? '#333',
                  fontSize: 10,
                  margin: [0, 0, 0, 2] as [number, number, number, number],
                }))
              : [{ text: '[OK] Nenhum defeito detectado', color: '#2e7d32', fontSize: 10 } as Content];

            return {
              table: {
                widths: [175, '*'],
                body: [[
                  data ? { image: `data:${mimeType};base64,${data}`, width: 170 } : { text: '[Imagem indisponivel]', color: '#999', fontSize: 10 },
                  {
                    stack: [
                      { text: `Foto ${idx + 1}`, bold: true, fontSize: 11, margin: [0, 0, 0, 6] } as Content,
                      ...defectStack,
                      ...(summary ? [{ text: `"${summary}"`, italics: true, color: '#78909c', fontSize: 10, margin: [0, 6, 0, 0] } as Content] : []),
                    ],
                    margin: [8, 0, 0, 0] as [number, number, number, number],
                  },
                ]],
              },
              layout: 'noBorders',
              margin: [0, 0, 0, 12] as [number, number, number, number],
            } as Content;
          }),
        ]
      : [];

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'RELATORIO DE INSPECAO INDUSTRIAL', style: 'header' } as Content,
        { text: `Equipamento: ${equipment.name}`, style: 'subheader' } as Content,
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Tipo', EQUIPMENT_TYPE_LABEL[equipment.type] ?? equipment.type],
              ['Localizacao', equipment.location],
              ['Inspetor', inspection.inspector],
              ['Data', new Date(inspection.createdAt).toLocaleString('pt-BR')],
              ['Status', inspection.status === 'completed' ? 'Concluida' : 'Aberta'],
              ['ID da Inspecao', inspection.id],
            ],
          },
          margin: [0, 10, 0, 20] as [number, number, number, number],
        } as Content,
        { text: 'CHECKLIST DE INSPECAO', style: 'sectionHeader' } as Content,
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
        ...photoContent,
        { text: `\nRelatorio gerado em: ${new Date().toLocaleString('pt-BR')} | ID: ${inspection.id}`, fontSize: 8, color: '#757575', margin: [0, 30, 0, 0] as [number, number, number, number] } as Content,
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

  private async fetchImagesAsBase64(
    photosWithUrls: PhotoWithUrl[],
  ): Promise<Array<{ idx: number; data: string; mimeType: string }>> {
    return Promise.all(
      photosWithUrls.map(async ({ url }, idx) => {
        try {
          const response = await fetch(url);
          const mimeType = response.headers.get('content-type') ?? 'image/jpeg';
          const buffer = await response.arrayBuffer();
          return { idx, data: Buffer.from(buffer).toString('base64'), mimeType };
        } catch {
          return { idx, data: '', mimeType: 'image/jpeg' };
        }
      })
    );
  }
}
