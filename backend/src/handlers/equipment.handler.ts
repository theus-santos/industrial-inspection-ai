import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { EquipmentRepo } from '../repositories/equipment.repo';
import { InspectionRepo } from '../repositories/inspection.repo';

const TABLE = process.env.TABLE_NAME!;

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const repo = new EquipmentRepo(TABLE);
  const method = event.requestContext.http.method;
  const id = event.pathParameters?.id;
  const path = event.rawPath;

  try {
    if (method === 'POST') {
      const body = JSON.parse(event.body ?? '{}');
      if (!body.name || !body.type || !body.location) {
        return json(400, { message: 'name, type and location are required' });
      }
      const equipment = await repo.create(body);
      return json(201, equipment);
    }

    if (method === 'GET' && id && path.includes('/history')) {
      const inspectionRepo = new InspectionRepo(TABLE);
      const history = await inspectionRepo.listByEquipment(id);
      return json(200, history);
    }

    if (method === 'GET' && id) {
      const equipment = await repo.findById(id);
      if (!equipment) return json(404, { message: 'Equipment not found' });
      return json(200, equipment);
    }

    if (method === 'GET') {
      const list = await repo.listAll();
      return json(200, list);
    }

    if (method === 'DELETE' && id) {
      await repo.delete(id);
      return json(204, {});
    }

    return json(405, { message: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return json(500, { message: 'Internal server error' });
  }
}
