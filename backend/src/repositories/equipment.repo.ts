import { PutCommand, GetCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getDocumentClient } from '../shared/dynamo.client';
import { Equipment, EquipmentType } from '../shared/types';

export class EquipmentRepo {
  constructor(private readonly table: string) {}

  async create(input: { name: string; type: EquipmentType; location: string }): Promise<Equipment> {
    const equipment: Equipment = {
      id: uuidv4(),
      name: input.name,
      type: input.type,
      location: input.location,
      createdAt: new Date().toISOString(),
    };
    await getDocumentClient().send(
      new PutCommand({
        TableName: this.table,
        Item: { PK: `EQUIPMENT#${equipment.id}`, SK: 'METADATA', ...equipment },
      })
    );
    return equipment;
  }

  async findById(id: string): Promise<Equipment | null> {
    const result = await getDocumentClient().send(
      new GetCommand({ TableName: this.table, Key: { PK: `EQUIPMENT#${id}`, SK: 'METADATA' } })
    );
    if (!result.Item) return null;
    const { PK, SK, ...equipment } = result.Item;
    return equipment as Equipment;
  }

  async listAll(): Promise<Equipment[]> {
    const result = await getDocumentClient().send(
      new ScanCommand({
        TableName: this.table,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: { ':sk': 'METADATA' },
      })
    );
    return (result.Items ?? []).map(({ PK, SK, ...eq }) => eq as Equipment);
  }

  async delete(id: string): Promise<void> {
    await getDocumentClient().send(
      new DeleteCommand({ TableName: this.table, Key: { PK: `EQUIPMENT#${id}`, SK: 'METADATA' } })
    );
  }
}
