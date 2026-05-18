import { handler } from '../../src/handlers/equipment.handler';
import { EquipmentRepo } from '../../src/repositories/equipment.repo';
import { InspectionRepo } from '../../src/repositories/inspection.repo';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

jest.mock('../../src/repositories/equipment.repo');
jest.mock('../../src/repositories/inspection.repo');

const MockEquipRepo = EquipmentRepo as jest.MockedClass<typeof EquipmentRepo>;
const MockInspRepo = InspectionRepo as jest.MockedClass<typeof InspectionRepo>;

function makeEvent(method: string, path: string, body?: object, pathParams?: Record<string, string>): APIGatewayProxyEventV2 {
  return {
    requestContext: { http: { method } },
    rawPath: path,
    pathParameters: pathParams,
    body: body ? JSON.stringify(body) : undefined,
  } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => { MockEquipRepo.mockClear(); MockInspRepo.mockClear(); });

describe('POST /equipments', () => {
  it('returns 201 with created equipment', async () => {
    const created = { id: 'eq-1', name: 'Compressor', type: 'maintenance' as const, location: 'Sala 1', createdAt: '2026-01-01T00:00:00Z' };
    MockEquipRepo.prototype.create.mockResolvedValue(created);
    const event = makeEvent('POST', '/equipments', { name: 'Compressor', type: 'maintenance', location: 'Sala 1' });
    const res = await handler(event) as APIGatewayProxyStructuredResultV2;
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body as string)).toEqual(created);
  });
});

describe('GET /equipments', () => {
  it('returns 200 with list', async () => {
    MockEquipRepo.prototype.listAll.mockResolvedValue([]);
    const event = makeEvent('GET', '/equipments');
    const res = await handler(event) as APIGatewayProxyStructuredResultV2;
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /equipments/{id}', () => {
  it('returns 200 when found', async () => {
    const eq = { id: 'eq-1', name: 'A', type: 'maintenance' as const, location: 'L', createdAt: '2026-01-01T00:00:00Z' };
    MockEquipRepo.prototype.findById.mockResolvedValue(eq);
    const event = makeEvent('GET', '/equipments/eq-1', undefined, { id: 'eq-1' });
    const res = await handler(event) as APIGatewayProxyStructuredResultV2;
    expect(res.statusCode).toBe(200);
  });

  it('returns 404 when not found', async () => {
    MockEquipRepo.prototype.findById.mockResolvedValue(null);
    const event = makeEvent('GET', '/equipments/missing', undefined, { id: 'missing' });
    const res = await handler(event) as APIGatewayProxyStructuredResultV2;
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /equipments/{id}/history', () => {
  it('returns 200 with inspection history', async () => {
    MockInspRepo.prototype.listByEquipment.mockResolvedValue([]);
    const event = makeEvent('GET', '/equipments/eq-1/history', undefined, { id: 'eq-1' });
    const res = await handler(event) as APIGatewayProxyStructuredResultV2;
    expect(res.statusCode).toBe(200);
  });
});
