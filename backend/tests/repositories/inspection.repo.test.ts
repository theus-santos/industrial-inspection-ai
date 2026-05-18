import { InspectionRepo } from '../../src/repositories/inspection.repo';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);
beforeEach(() => ddbMock.reset());

const TABLE = 'InspectionTable';

describe('InspectionRepo.create', () => {
  it('creates inspection and returns it', async () => {
    ddbMock.on(PutCommand).resolves({});
    const repo = new InspectionRepo(TABLE);
    const result = await repo.create({ equipmentId: 'eq-1', inspector: 'João', notes: '' });
    expect(result.equipmentId).toBe('eq-1');
    expect(result.status).toBe('open');
    expect(result.id).toBeDefined();
  });
});

describe('InspectionRepo.findById', () => {
  it('returns inspection when found', async () => {
    const item = { id: 'ins-1', equipmentId: 'eq-1', inspector: 'João', notes: '', status: 'open', createdAt: '2026-01-01T00:00:00Z' };
    ddbMock.on(GetCommand).resolves({ Item: item });
    const repo = new InspectionRepo(TABLE);
    const result = await repo.findById('ins-1');
    expect(result).toEqual(item);
  });
});

describe('InspectionRepo.saveChecklist', () => {
  it('writes checklist items in a transaction', async () => {
    ddbMock.on(TransactWriteCommand).resolves({});
    const repo = new InspectionRepo(TABLE);
    const items = [
      { id: 'ci-1', inspectionId: 'ins-1', label: 'Nível de óleo', category: 'Lubrificação', checked: true },
    ];
    await expect(repo.saveChecklist('ins-1', items)).resolves.not.toThrow();
  });
});

describe('InspectionRepo.getChecklist', () => {
  it('returns checklist items for inspection', async () => {
    const items = [{ id: 'ci-1', inspectionId: 'ins-1', label: 'Nível de óleo', category: 'Lubrificação', checked: true }];
    ddbMock.on(QueryCommand).resolves({ Items: items.map(i => ({ PK: `INSPECTION#ins-1`, SK: `CHECKLIST#${i.id}`, ...i })) });
    const repo = new InspectionRepo(TABLE);
    const result = await repo.getChecklist('ins-1');
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Nível de óleo');
  });
});

describe('InspectionRepo.listByEquipment', () => {
  it('returns inspections for equipment using GSI2', async () => {
    const items = [{ id: 'ins-1', equipmentId: 'eq-1', inspector: 'João', notes: '', status: 'open', createdAt: '2026-01-01T00:00:00Z' }];
    ddbMock.on(QueryCommand).resolves({ Items: items.map(i => ({ PK: `INSPECTION#${i.id}`, SK: 'METADATA', ...i })) });
    const repo = new InspectionRepo(TABLE);
    const result = await repo.listByEquipment('eq-1');
    expect(result).toHaveLength(1);
    expect(result[0].equipmentId).toBe('eq-1');
  });
});
