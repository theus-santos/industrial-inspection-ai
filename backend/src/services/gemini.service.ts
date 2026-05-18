import { GoogleGenerativeAI } from '@google/generative-ai';
import { Defect } from '../shared/types';

const ANALYSIS_PROMPT = `Analyze this industrial inspection image.
Identify the presence of the following defect types:
crack, rust, leak, wear, weld_failure, damaged_part, loose_bolt, deformation, safety_risk.

Respond ONLY in JSON with this exact format:
{
  "defects": [
    { "type": "<defect_type>", "severity": "low|medium|high|critical", "confidence": 0.0-1.0, "location": "<location description>" }
  ],
  "summary": "<overall condition summary>"
}

Use the English defect type names listed above. If no defects found, return defects: [].`;

export interface GeminiAnalysisResult {
  defects: Defect[];
  summary: string;
}

export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeImage(imageUrl: string): Promise<GeminiAnalysisResult> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
      ANALYSIS_PROMPT,
      { inlineData: { mimeType: 'image/jpeg', data: await this.fetchImageAsBase64(imageUrl) } },
    ]);
    const text = result.response.text();
    const json = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    return { defects: json.defects ?? [], summary: json.summary ?? '' };
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
}
