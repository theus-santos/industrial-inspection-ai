import { handler } from '../../src/handlers/inspection.handler';
import { InspectionRepo } from '../../src/repositories/inspection.repo';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

jest.mock('../../src/repositories/inspection.repo');
const MockRepo = InspectionRepo as jest.MockedClass<typeof InspectionRepo>;

function makeEvent(method: string, path: string, body?: object, pathParams?: Record<string, string>): APIGatewayProxyEventV2 {
  return {
    requestContext: { http: { method } },
    rawPath: path,
    pathParameters: pathParams,
    body: body ? JSON.stringify(body) : undefined,
  } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => MockRepo.mockClear());

describe('POST /inspections', () => {
  it('returns 201 with inspection and auto-generated checklist', async () => {
    const inspection = { id: 'ins-1', equipmentId: 'eq-1', inspector: 'João', notes: '', status: 'open' as const, createdAt: '2026-01-01T00:00:00Z' };
    MockRepo.prototype.create.mockResolvedValue(inspection);
    MockRepo.prototype.saveChecklist.mockResolvedValue(undefined);
    const event = makeEvent('POST', '/inspections', { equipmentId: 'eq-1', equipmentType: 'maintenance', inspector: 'João', notes: '' });
    const res = await handler(event) as APIGatewayProxyStructuredResultV2;
    expect(res.statusCode).toBe(201);
    expect(MockRepo.prototype.saveChecklist).toHaveBeenCalled();
  });
});

describe('GET /inspections/{id}', () => {
  it('returns inspection with checklist', async () => {
    const inspection = { id: 'ins-1', equipmentId: 'eq-1', inspector: 'João', notes: '', status: 'open' as const, createdAt: '2026-01-01T00:00:00Z' };
    MockRepo.prototype.findById.mockResolvedValue(inspection);
    MockRepo.prototype.getChecklist.mockResolvedValue([]);
    const event = makeEvent('GET', '/inspections/ins-1', undefined, { id: 'ins-1' });
    const res = await handler(event) as APIGatewayProxyStructuredResultV2;
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.inspection).toEqual(inspection);
    expect(body.checklist).toEqual([]);
  });
});

describe('PUT /inspections/{id}/checklist', () => {
  it('saves checklist and returns 200', async () => {
    MockRepo.prototype.saveChecklist.mockResolvedValue(undefined);
    const items = [{ id: 'ci-1', inspectionId: 'ins-1', label: 'Nível de óleo', category: 'Lubrificação', checked: true }];
    const event = makeEvent('PUT', '/inspections/ins-1/checklist', { items }, { id: 'ins-1' });
    const res = await handler(event) as APIGatewayProxyStructuredResultV2;
    expect(res.statusCode).toBe(200);
  });
});
