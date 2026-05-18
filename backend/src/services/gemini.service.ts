import { GoogleGenerativeAI } from '@google/generative-ai';
import { Defect } from '../shared/types';

const ANALYSIS_PROMPT = (equipmentType: string) => `Voce esta analisando uma foto de inspecao industrial de um equipamento do tipo: ${equipmentType}.
Identifique defeitos relevantes para esse tipo de equipamento dentre os tipos abaixo:
crack, rust, leak, wear, weld_failure, damaged_part, loose_bolt, deformation, safety_risk.

Se a imagem claramente NAO for compativel com o tipo de equipamento informado, retorne defects vazio e explique no summary.

Responda APENAS em JSON com este formato exato:
{
  "defects": [
    { "type": "<defect_type>", "severity": "low|medium|high|critical", "confidence": 0.0-1.0, "location": "<descricao em portugues>" }
  ],
  "summary": "<resumo geral em portugues>"
}

Use os nomes de tipo em ingles listados acima. Escreva "location" e "summary" em portugues brasileiro. Se nenhum defeito encontrado, retorne defects: [].`;

export interface GeminiAnalysisResult {
  defects: Defect[];
  summary: string;
}

export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeImage(imageUrl: string, equipmentType: string): Promise<GeminiAnalysisResult> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const { data, mimeType } = await this.fetchImageAsBase64(imageUrl);
    const result = await model.generateContent([
      ANALYSIS_PROMPT(equipmentType),
      { inlineData: { mimeType, data } },
    ]);
    const text = result.response.text();
    try {
      const json = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      return { defects: json.defects ?? [], summary: json.summary ?? '' };
    } catch {
      return { defects: [], summary: 'Nao foi possivel analisar a imagem. Verifique se a foto e de um equipamento industrial.' };
    }
  }

  private async fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
    const response = await fetch(url);
    const mimeType = response.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await response.arrayBuffer();
    return { data: Buffer.from(buffer).toString('base64'), mimeType };
  }
}
