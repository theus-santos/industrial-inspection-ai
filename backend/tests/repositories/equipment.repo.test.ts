import { EquipmentRepo } from '../../src/repositories/equipment.repo';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

const TABLE = 'InspectionTable';

describe('EquipmentRepo.create', () => {
  it('puts equipment item and returns it', async () => {
    ddbMock.on(PutCommand).resolves({});
    const repo = new EquipmentRepo(TABLE);
    const equipment = await repo.create({ name: 'Compressor A', type: 'maintenance', location: 'Sala 1' });
    expect(equipment.name).toBe('Compressor A');
    expect(equipment.type).toBe('maintenance');
    expect(equipment.id).toBeDefined();
    expect(equipment.createdAt).toBeDefined();
  });
});

describe('EquipmentRepo.findById', () => {
  it('returns equipment when found', async () => {
    const item = { id: 'eq-1', name: 'Compressor A', type: 'maintenance', location: 'Sala 1', createdAt: '2026-01-01T00:00:00Z' };
    ddbMock.on(GetCommand).resolves({ Item: item });
    const repo = new EquipmentRepo(TABLE);
    const result = await repo.findById('eq-1');
    expect(result).toEqual(item);
  });

  it('returns null when not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    const repo = new EquipmentRepo(TABLE);
    const result = await repo.findById('missing');
    expect(result).toBeNull();
  });
});

describe('EquipmentRepo.listAll', () => {
  it('returns list of equipment', async () => {
    const items = [{ id: 'eq-1', name: 'A', type: 'maintenance', location: 'L', createdAt: '2026-01-01T00:00:00Z' }];
    ddbMock.on(ScanCommand).resolves({ Items: items });
    const repo = new EquipmentRepo(TABLE);
    const result = await repo.listAll();
    expect(result).toEqual(items);
  });
});
