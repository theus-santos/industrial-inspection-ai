import { PutCommand, GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getDocumentClient } from '../shared/dynamo.client';
import { ChecklistItem, Inspection } from '../shared/types';

export class InspectionRepo {
  constructor(private readonly table: string) {}

  async create(input: { equipmentId: string; inspector: string; notes: string }): Promise<Inspection> {
    const inspection: Inspection = {
      id: uuidv4(),
      equipmentId: input.equipmentId,
      inspector: input.inspector,
      notes: input.notes,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    await getDocumentClient().send(
      new PutCommand({
        TableName: this.table,
        Item: { PK: `INSPECTION#${inspection.id}`, SK: 'METADATA', ...inspection },
      })
    );
    return inspection;
  }

  async findById(id: string): Promise<Inspection | null> {
    const result = await getDocumentClient().send(
      new GetCommand({ TableName: this.table, Key: { PK: `INSPECTION#${id}`, SK: 'METADATA' } })
    );
    if (!result.Item) return null;
    const { PK, SK, ...inspection } = result.Item;
    return inspection as Inspection;
  }

  async saveChecklist(inspectionId: string, items: ChecklistItem[]): Promise<void> {
    if (items.length === 0) return;
    await getDocumentClient().send(
      new TransactWriteCommand({
        TransactItems: items.map(item => ({
          Put: {
            TableName: this.table,
            Item: { PK: `INSPECTION#${inspectionId}`, SK: `CHECKLIST#${item.id}`, ...item },
          },
        })),
      })
    );
  }

  async getChecklist(inspectionId: string): Promise<ChecklistItem[]> {
    const result = await getDocumentClient().send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': `INSPECTION#${inspectionId}`, ':prefix': 'CHECKLIST#' },
      })
    );
    return (result.Items ?? []).map(({ PK, SK, ...item }) => item as ChecklistItem);
  }

  async listByEquipment(equipmentId: string): Promise<Inspection[]> {
    const result = await getDocumentClient().send(
      new QueryCommand({
        TableName: this.table,
        IndexName: 'GSI2-equipmentId-createdAt',
        KeyConditionExpression: 'equipmentId = :eid',
        ExpressionAttributeValues: { ':eid': equipmentId },
        ScanIndexForward: false,
      })
    );
    return (result.Items ?? []).map(({ PK, SK, ...ins }) => ins as Inspection);
  }
}
