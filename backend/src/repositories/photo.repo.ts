import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getDocumentClient } from '../shared/dynamo.client';
import { DefectAnalysis, Photo } from '../shared/types';

export class PhotoRepo {
  constructor(private readonly table: string) {}

  async createPhotoRecord(input: { id: string; inspectionId: string; s3Key: string }): Promise<Photo> {
    const photo: Photo = {
      id: input.id,
      inspectionId: input.inspectionId,
      s3Key: input.s3Key,
      createdAt: new Date().toISOString(),
    };
    await getDocumentClient().send(
      new PutCommand({
        TableName: this.table,
        Item: { PK: `INSPECTION#${input.inspectionId}`, SK: `PHOTO#${photo.id}`, ...photo },
      })
    );
    return photo;
  }

  async findById(id: string, inspectionId: string): Promise<Photo | null> {
    const result = await getDocumentClient().send(
      new GetCommand({ TableName: this.table, Key: { PK: `INSPECTION#${inspectionId}`, SK: `PHOTO#${id}` } })
    );
    if (!result.Item) return null;
    const { PK, SK, ...photo } = result.Item;
    return photo as Photo;
  }

  async listByInspection(inspectionId: string): Promise<Photo[]> {
    const result = await getDocumentClient().send(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': `INSPECTION#${inspectionId}`, ':prefix': 'PHOTO#' },
      })
    );
    return (result.Items ?? []).map(({ PK, SK, ...p }) => p as Photo);
  }

  async saveAnalysis(photoId: string, analysis: DefectAnalysis): Promise<void> {
    await getDocumentClient().send(
      new PutCommand({
        TableName: this.table,
        Item: { PK: `PHOTO#${photoId}`, SK: 'ANALYSIS', ...analysis },
      })
    );
  }

  async getAnalysis(photoId: string): Promise<DefectAnalysis | null> {
    const result = await getDocumentClient().send(
      new GetCommand({ TableName: this.table, Key: { PK: `PHOTO#${photoId}`, SK: 'ANALYSIS' } })
    );
    if (!result.Item) return null;
    const { PK, SK, ...analysis } = result.Item;
    return analysis as DefectAnalysis;
  }
}
