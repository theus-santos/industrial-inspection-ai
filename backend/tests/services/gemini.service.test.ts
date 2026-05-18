jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            defects: [{ type: 'rust', severity: 'medium', confidence: 0.87, location: 'bottom left corner' }],
            summary: 'Moderate rust detected on structure.',
          }),
        },
      }),
    }),
  })),
}));

import { GeminiService } from '../../src/services/gemini.service';

describe('GeminiService.analyzeImage', () => {
  it('returns parsed defects from Gemini response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      arrayBuffer: async () => Buffer.from('fake-image').buffer,
    } as Response);

    const service = new GeminiService('fake-api-key');
    const result = await service.analyzeImage('https://example.com/photo.jpg');
    expect(result.defects).toHaveLength(1);
    expect(result.defects[0].type).toBe('rust');
    expect(result.defects[0].severity).toBe('medium');
    expect(result.summary).toBe('Moderate rust detected on structure.');
  });

  it('returns empty defects when image is clean', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      arrayBuffer: async () => Buffer.from('fake-image').buffer,
    } as Response);

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    GoogleGenerativeAI.mockImplementationOnce(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => JSON.stringify({ defects: [], summary: 'No defects found.' }) },
        }),
      }),
    }));
    const service = new GeminiService('fake-api-key');
    const result = await service.analyzeImage('https://example.com/clean.jpg');
    expect(result.defects).toHaveLength(0);
  });
});
