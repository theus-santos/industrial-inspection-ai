import { getDocumentClient } from '../../src/shared/dynamo.client';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

describe('getDocumentClient', () => {
  it('returns a DynamoDBDocumentClient instance', () => {
    const client = getDocumentClient();
    expect(client).toBeInstanceOf(DynamoDBDocumentClient);
  });

  it('returns the same instance on multiple calls', () => {
    const a = getDocumentClient();
    const b = getDocumentClient();
    expect(a).toBe(b);
  });
});
