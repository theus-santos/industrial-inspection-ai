import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { InspectionRepo } from '../repositories/inspection.repo';
import { ChecklistItem, CHECKLIST_TEMPLATES, EquipmentType } from '../shared/types';

const TABLE = process.env.TABLE_NAME!;

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const repo = new InspectionRepo(TABLE);
  const method = event.requestContext.http.method;
  const id = event.pathParameters?.id;
  const path = event.rawPath;

  try {
    if (method === 'POST' && path.endsWith('/inspections')) {
      const body = JSON.parse(event.body ?? '{}');
      const inspection = await repo.create({ equipmentId: body.equipmentId, inspector: body.inspector, notes: body.notes ?? '' });
      const templates = CHECKLIST_TEMPLATES[body.equipmentType as EquipmentType] ?? [];
      const items: ChecklistItem[] = templates.map(t => ({
        id: uuidv4(), inspectionId: inspection.id, label: t.label, category: t.category, checked: false,
      }));
      await repo.saveChecklist(inspection.id, items);
      return json(201, { inspection, checklist: items });
    }

    if (method === 'GET' && id && !path.includes('/checklist')) {
      const inspection = await repo.findById(id);
      if (!inspection) return json(404, { message: 'Inspection not found' });
      const checklist = await repo.getChecklist(id);
      return json(200, { inspection, checklist });
    }

    if (method === 'PUT' && id && path.includes('/checklist')) {
      const body = JSON.parse(event.body ?? '{}');
      await repo.saveChecklist(id, body.items);
      return json(200, { message: 'Checklist saved' });
    }

    return json(405, { message: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return json(500, { message: 'Internal server error' });
  }
}
