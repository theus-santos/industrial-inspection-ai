# Industrial Inspection AI — Backend + Infrastructure Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision all AWS infrastructure via CDK and implement all Lambda functions (equipment CRUD, inspection CRUD, photo upload, AI analysis via Gemini Flash, PDF report generation).

**Architecture:** Monorepo root with `infra/` (AWS CDK v2) and `backend/` (Lambda Node.js 20/TS). CDK provisions DynamoDB single-table, two S3 buckets (photos + PDFs), Cognito User Pool, and API Gateway HTTP API wired to five Lambda functions. Lambda handlers follow repository pattern — handlers parse HTTP events, repositories talk to DynamoDB/S3, services call Gemini and pdfmake.

**Tech Stack:** Node.js 20 / TypeScript 5, AWS CDK v2, `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, `@google/generative-ai`, `pdfmake`, Jest + ts-jest, ESLint.

---

## File Map

```
industrial-inspection-ai/
├── package.json                          # root workspace
├── .gitignore
├── infra/
│   ├── package.json
│   ├── tsconfig.json
│   ├── cdk.json
│   ├── bin/app.ts
│   └── lib/inspection-stack.ts
└── backend/
    ├── package.json
    ├── tsconfig.json
    ├── jest.config.js
    └── src/
        ├── shared/
        │   ├── types.ts
        │   ├── dynamo.client.ts
        │   └── s3.client.ts
        ├── repositories/
        │   ├── equipment.repo.ts
        │   ├── inspection.repo.ts
        │   └── photo.repo.ts
        ├── services/
        │   ├── gemini.service.ts
        │   └── pdf.service.ts
        └── handlers/
            ├── equipment.handler.ts
            ├── inspection.handler.ts
            ├── photo.handler.ts
            ├── analyze.handler.ts
            └── report.handler.ts
    └── tests/
        ├── repositories/
        │   ├── equipment.repo.test.ts
        │   ├── inspection.repo.test.ts
        │   └── photo.repo.test.ts
        ├── services/
        │   ├── gemini.service.test.ts
        │   └── pdf.service.test.ts
        └── handlers/
            ├── equipment.handler.test.ts
            ├── inspection.handler.test.ts
            ├── photo.handler.test.ts
            ├── analyze.handler.test.ts
            └── report.handler.test.ts
```

---

## Task 1: Monorepo root setup

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "industrial-inspection-ai",
  "private": true,
  "workspaces": ["backend", "infra"],
  "scripts": {
    "test:backend": "yarn workspace backend test",
    "lint:backend": "yarn workspace backend lint",
    "build:backend": "yarn workspace backend build",
    "deploy:infra": "yarn workspace infra cdk deploy"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
cdk.out/
.env
*.js.map
coverage/
```

- [ ] **Step 3: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: monorepo root setup"
```

---

## Task 2: Backend project setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/jest.config.js`

- [ ] **Step 1: Create backend/package.json**

```json
{
  "name": "backend",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src tests --ext .ts"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.600.0",
    "@aws-sdk/lib-dynamodb": "^3.600.0",
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/s3-request-presigner": "^3.600.0",
    "@google/generative-ai": "^0.15.0",
    "pdfmake": "^0.2.10",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.143",
    "@types/node": "^20.0.0",
    "@types/pdfmake": "^0.2.9",
    "@types/uuid": "^10.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.5.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0"
  }
}
```

- [ ] **Step 2: Create backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create backend/jest.config.js**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
};
```

- [ ] **Step 4: Install dependencies**

```bash
cd backend && yarn install
```

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "chore: backend project setup"
```

---

## Task 3: Shared types

**Files:**
- Create: `backend/src/shared/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export type EquipmentType = 'maintenance' | 'welding' | 'structures' | 'equipment';
export type DefectType =
  | 'crack' | 'rust' | 'leak' | 'wear' | 'weld_failure'
  | 'damaged_part' | 'loose_bolt' | 'deformation' | 'safety_risk';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type InspectionStatus = 'open' | 'completed';

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  location: string;
  createdAt: string;
}

export interface Inspection {
  id: string;
  equipmentId: string;
  inspector: string;
  notes: string;
  status: InspectionStatus;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  inspectionId: string;
  label: string;
  category: string;
  checked: boolean;
}

export interface Photo {
  id: string;
  inspectionId: string;
  s3Key: string;
  createdAt: string;
  analyzedAt?: string;
}

export interface Defect {
  type: DefectType;
  severity: Severity;
  confidence: number;
  location: string;
}

export interface DefectAnalysis {
  photoId: string;
  defects: Defect[];
  summary: string;
  analyzedAt: string;
}

export const CHECKLIST_TEMPLATES: Record<EquipmentType, { category: string; label: string }[]> = {
  maintenance: [
    { category: 'Lubrificação', label: 'Nível de óleo adequado' },
    { category: 'Lubrificação', label: 'Sem vazamentos de óleo' },
    { category: 'Vibrações', label: 'Vibração dentro do normal' },
    { category: 'Temperatura', label: 'Temperatura operacional normal' },
    { category: 'Parafusos', label: 'Parafusos de fixação apertados' },
  ],
  welding: [
    { category: 'Trincas', label: 'Sem trincas visíveis' },
    { category: 'Solda', label: 'Cordão de solda uniforme' },
    { category: 'Solda', label: 'Sem porosidade na solda' },
    { category: 'Deformações', label: 'Sem deformações térmicas' },
  ],
  structures: [
    { category: 'Ferrugem', label: 'Sem pontos de ferrugem' },
    { category: 'Desgaste', label: 'Espessura da parede adequada' },
    { category: 'Segurança', label: 'Sem riscos de segurança aparentes' },
    { category: 'Segurança', label: 'Sinalização de segurança visível' },
  ],
  equipment: [
    { category: 'Peças', label: 'Sem peças danificadas' },
    { category: 'Vazamentos', label: 'Sem vazamentos de fluidos' },
    { category: 'Deformações', label: 'Estrutura sem deformações' },
    { category: 'Operação', label: 'Funcionamento dentro do esperado' },
  ],
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/shared/types.ts
git commit -m "feat: add shared domain types and checklist templates"
```

---

## Task 4: DynamoDB client

**Files:**
- Create: `backend/src/shared/dynamo.client.ts`
- Create: `backend/tests/shared/dynamo.client.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// backend/tests/shared/dynamo.client.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest tests/shared/dynamo.client.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../../src/shared/dynamo.client'`

- [ ] **Step 3: Implement dynamo.client.ts**

```typescript
// backend/src/shared/dynamo.client.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let instance: DynamoDBDocumentClient | null = null;

export function getDocumentClient(): DynamoDBDocumentClient {
  if (!instance) {
    const raw = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
    instance = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return instance;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest tests/shared/dynamo.client.test.ts --no-coverage
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/shared/dynamo.client.ts backend/tests/shared/dynamo.client.test.ts
git commit -m "feat: add DynamoDB document client singleton"
```

---

## Task 5: S3 client

**Files:**
- Create: `backend/src/shared/s3.client.ts`
- Create: `backend/tests/shared/s3.client.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// backend/tests/shared/s3.client.test.ts
import { getS3Client } from '../../src/shared/s3.client';
import { S3Client } from '@aws-sdk/client-s3';

describe('getS3Client', () => {
  it('returns an S3Client instance', () => {
    expect(getS3Client()).toBeInstanceOf(S3Client);
  });

  it('returns the same instance on multiple calls', () => {
    expect(getS3Client()).toBe(getS3Client());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest tests/shared/s3.client.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implement s3.client.ts**

```typescript
// backend/src/shared/s3.client.ts
import { S3Client } from '@aws-sdk/client-s3';

let instance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!instance) {
    instance = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
  }
  return instance;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest tests/shared/s3.client.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/shared/s3.client.ts backend/tests/shared/s3.client.test.ts
git commit -m "feat: add S3 client singleton"
```

---

## Task 6: Equipment repository

**Files:**
- Create: `backend/src/repositories/equipment.repo.ts`
- Create: `backend/tests/repositories/equipment.repo.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/repositories/equipment.repo.test.ts
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
```

> Note: install `aws-sdk-client-mock`: `cd backend && yarn add -D aws-sdk-client-mock`

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/repositories/equipment.repo.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implement equipment.repo.ts**

```typescript
// backend/src/repositories/equipment.repo.ts
import { PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest tests/repositories/equipment.repo.test.ts --no-coverage
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/equipment.repo.ts backend/tests/repositories/equipment.repo.test.ts
git commit -m "feat: add equipment repository (create, findById, listAll)"
```

---

## Task 7: Equipment handler

**Files:**
- Create: `backend/src/handlers/equipment.handler.ts`
- Create: `backend/tests/handlers/equipment.handler.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/handlers/equipment.handler.test.ts
import { handler } from '../../src/handlers/equipment.handler';
import { EquipmentRepo } from '../../src/repositories/equipment.repo';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../../src/repositories/equipment.repo');

const MockRepo = EquipmentRepo as jest.MockedClass<typeof EquipmentRepo>;

function makeEvent(method: string, path: string, body?: object, pathParams?: Record<string, string>): APIGatewayProxyEventV2 {
  return {
    requestContext: { http: { method } },
    rawPath: path,
    pathParameters: pathParams,
    body: body ? JSON.stringify(body) : undefined,
  } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => MockRepo.mockClear());

describe('POST /equipments', () => {
  it('returns 201 with created equipment', async () => {
    const created = { id: 'eq-1', name: 'Compressor', type: 'maintenance' as const, location: 'Sala 1', createdAt: '2026-01-01T00:00:00Z' };
    MockRepo.prototype.create.mockResolvedValue(created);
    const event = makeEvent('POST', '/equipments', { name: 'Compressor', type: 'maintenance', location: 'Sala 1' });
    const res = await handler(event);
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toEqual(created);
  });
});

describe('GET /equipments', () => {
  it('returns 200 with list', async () => {
    MockRepo.prototype.listAll.mockResolvedValue([]);
    const event = makeEvent('GET', '/equipments');
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /equipments/{id}', () => {
  it('returns 200 when found', async () => {
    const eq = { id: 'eq-1', name: 'A', type: 'maintenance' as const, location: 'L', createdAt: '2026-01-01T00:00:00Z' };
    MockRepo.prototype.findById.mockResolvedValue(eq);
    const event = makeEvent('GET', '/equipments/eq-1', undefined, { id: 'eq-1' });
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
  });

  it('returns 404 when not found', async () => {
    MockRepo.prototype.findById.mockResolvedValue(null);
    const event = makeEvent('GET', '/equipments/missing', undefined, { id: 'missing' });
    const res = await handler(event);
    expect(res.statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/handlers/equipment.handler.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Implement equipment.handler.ts**

```typescript
// backend/src/handlers/equipment.handler.ts
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

    return json(405, { message: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return json(500, { message: 'Internal server error' });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest tests/handlers/equipment.handler.test.ts --no-coverage
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/handlers/equipment.handler.ts backend/tests/handlers/equipment.handler.test.ts
git commit -m "feat: add equipment handler (POST, GET list, GET by id)"
```

---

## Task 8: Inspection repository

**Files:**
- Create: `backend/src/repositories/inspection.repo.ts`
- Create: `backend/tests/repositories/inspection.repo.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/repositories/inspection.repo.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/repositories/inspection.repo.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Implement inspection.repo.ts**

```typescript
// backend/src/repositories/inspection.repo.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest tests/repositories/inspection.repo.test.ts --no-coverage
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/inspection.repo.ts backend/tests/repositories/inspection.repo.test.ts
git commit -m "feat: add inspection repository (create, findById, checklist)"
```

---

## Task 9: Inspection handler

**Files:**
- Create: `backend/src/handlers/inspection.handler.ts`
- Create: `backend/tests/handlers/inspection.handler.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/handlers/inspection.handler.test.ts
import { handler } from '../../src/handlers/inspection.handler';
import { InspectionRepo } from '../../src/repositories/inspection.repo';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { CHECKLIST_TEMPLATES } from '../../src/shared/types';

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
    MockRepo.prototype.saveChecklist.mockResolvedValue();
    const event = makeEvent('POST', '/inspections', { equipmentId: 'eq-1', equipmentType: 'maintenance', inspector: 'João', notes: '' });
    const res = await handler(event);
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
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.inspection).toEqual(inspection);
    expect(body.checklist).toEqual([]);
  });
});

describe('PUT /inspections/{id}/checklist', () => {
  it('saves checklist and returns 200', async () => {
    MockRepo.prototype.saveChecklist.mockResolvedValue();
    const items = [{ id: 'ci-1', inspectionId: 'ins-1', label: 'Nível de óleo', category: 'Lubrificação', checked: true }];
    const event = makeEvent('PUT', '/inspections/ins-1/checklist', { items }, { id: 'ins-1' });
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/handlers/inspection.handler.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Implement inspection.handler.ts**

```typescript
// backend/src/handlers/inspection.handler.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest tests/handlers/inspection.handler.test.ts --no-coverage
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/handlers/inspection.handler.ts backend/tests/handlers/inspection.handler.test.ts
git commit -m "feat: add inspection handler with auto-generated checklist"
```

---

## Task 10: Photo repository + handler (presigned URLs)

**Files:**
- Create: `backend/src/repositories/photo.repo.ts`
- Create: `backend/src/handlers/photo.handler.ts`
- Create: `backend/tests/handlers/photo.handler.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/handlers/photo.handler.test.ts
import { handler } from '../../src/handlers/photo.handler';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.presigned.url/photo.jpg'),
}));
jest.mock('../../src/shared/s3.client', () => ({ getS3Client: jest.fn() }));
jest.mock('../../src/repositories/photo.repo');

import { PhotoRepo } from '../../src/repositories/photo.repo';
const MockPhotoRepo = PhotoRepo as jest.MockedClass<typeof PhotoRepo>;

function makeEvent(method: string, body?: object): APIGatewayProxyEventV2 {
  return {
    requestContext: { http: { method } },
    rawPath: '/photos/presigned-url',
    body: body ? JSON.stringify(body) : undefined,
  } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => MockPhotoRepo.mockClear());

describe('GET /photos/presigned-url', () => {
  it('returns uploadUrl, photoId, s3Key', async () => {
    MockPhotoRepo.prototype.createPhotoRecord.mockResolvedValue({
      id: 'photo-1', inspectionId: 'ins-1', s3Key: 'photos/ins-1/photo-1.jpg', createdAt: '2026-01-01T00:00:00Z',
    });
    const event = makeEvent('GET', { inspectionId: 'ins-1', contentType: 'image/jpeg' });
    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.uploadUrl).toBe('https://s3.presigned.url/photo.jpg');
    expect(body.photoId).toBe('photo-1');
    expect(body.s3Key).toBe('photos/ins-1/photo-1.jpg');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/handlers/photo.handler.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Implement photo.repo.ts**

```typescript
// backend/src/repositories/photo.repo.ts
import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getDocumentClient } from '../shared/dynamo.client';
import { DefectAnalysis, Photo } from '../shared/types';

export class PhotoRepo {
  constructor(private readonly table: string) {}

  async createPhotoRecord(input: { inspectionId: string; s3Key: string }): Promise<Photo> {
    const photo: Photo = {
      id: uuidv4(),
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
```

- [ ] **Step 4: Implement photo.handler.ts**

```typescript
// backend/src/handlers/photo.handler.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '../shared/s3.client';
import { PhotoRepo } from '../repositories/photo.repo';

const TABLE = process.env.TABLE_NAME!;
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET!;

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const repo = new PhotoRepo(TABLE);

  try {
    const body = JSON.parse(event.body ?? '{}');
    const { inspectionId, contentType = 'image/jpeg' } = body;

    if (!inspectionId) return json(400, { message: 'inspectionId required' });

    const photo = await repo.createPhotoRecord({ inspectionId, s3Key: `photos/${inspectionId}/tmp` });
    const s3Key = `photos/${inspectionId}/${photo.id}.jpg`;

    const uploadUrl = await getSignedUrl(
      getS3Client(),
      new PutObjectCommand({ Bucket: PHOTOS_BUCKET, Key: s3Key, ContentType: contentType }),
      { expiresIn: 300 }
    );

    return json(200, { uploadUrl, photoId: photo.id, s3Key });
  } catch (err) {
    console.error(err);
    return json(500, { message: 'Internal server error' });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && npx jest tests/handlers/photo.handler.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/repositories/photo.repo.ts backend/src/handlers/photo.handler.ts backend/tests/handlers/photo.handler.test.ts
git commit -m "feat: add photo handler with S3 presigned URL generation"
```

---

## Task 11: Gemini AI service

**Files:**
- Create: `backend/src/services/gemini.service.ts`
- Create: `backend/tests/services/gemini.service.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/services/gemini.service.test.ts
import { GeminiService } from '../../src/services/gemini.service';

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            defects: [{ type: 'rust', severity: 'medium', confidence: 0.87, location: 'bottom left corner' }],
            summary: 'Moderate rust detected on structure.',
          }),
        },
      }),
    }),
  })),
}));

describe('GeminiService.analyzeImage', () => {
  it('returns parsed defects from Gemini response', async () => {
    const service = new GeminiService('fake-api-key');
    const result = await service.analyzeImage('https://example.com/photo.jpg');
    expect(result.defects).toHaveLength(1);
    expect(result.defects[0].type).toBe('rust');
    expect(result.defects[0].severity).toBe('medium');
    expect(result.summary).toBe('Moderate rust detected on structure.');
  });

  it('returns empty defects when image is clean', async () => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => JSON.stringify({ defects: [], summary: 'No defects found.' }) },
        }),
      }),
    }));
    const service = new GeminiService('fake-api-key');
    const result = await service.analyzeImage('https://example.com/clean.jpg');
    expect(result.defects).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/services/gemini.service.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Implement gemini.service.ts**

```typescript
// backend/src/services/gemini.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Defect } from '../shared/types';

const ANALYSIS_PROMPT = `Analyze this industrial inspection image.
Identify the presence of the following defect types:
crack, rust, leak, wear, weld_failure, damaged_part, loose_bolt, deformation, safety_risk.

Respond ONLY in JSON with this exact format:
{
  "defects": [
    { "type": "<defect_type>", "severity": "low|medium|high|critical", "confidence": 0.0-1.0, "location": "<location description>" }
  ],
  "summary": "<overall condition summary>"
}

Use the English defect type names listed above. If no defects found, return defects: [].`;

export interface GeminiAnalysisResult {
  defects: Defect[];
  summary: string;
}

export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeImage(imageUrl: string): Promise<GeminiAnalysisResult> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
      ANALYSIS_PROMPT,
      { inlineData: { mimeType: 'image/jpeg', data: await this.fetchImageAsBase64(imageUrl) } },
    ]);
    const text = result.response.text();
    const json = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    return { defects: json.defects ?? [], summary: json.summary ?? '' };
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest tests/services/gemini.service.test.ts --no-coverage
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/gemini.service.ts backend/tests/services/gemini.service.test.ts
git commit -m "feat: add Gemini Flash service for industrial defect analysis"
```

---

## Task 12: Analyze handler

**Files:**
- Create: `backend/src/handlers/analyze.handler.ts`
- Create: `backend/tests/handlers/analyze.handler.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/handlers/analyze.handler.test.ts
import { handler } from '../../src/handlers/analyze.handler';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../../src/services/gemini.service');
jest.mock('../../src/repositories/photo.repo');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.presigned.url/photo.jpg'),
}));
jest.mock('../../src/shared/s3.client', () => ({ getS3Client: jest.fn() }));

import { GeminiService } from '../../src/services/gemini.service';
import { PhotoRepo } from '../../src/repositories/photo.repo';

const MockGemini = GeminiService as jest.MockedClass<typeof GeminiService>;
const MockPhotoRepo = PhotoRepo as jest.MockedClass<typeof PhotoRepo>;

function makeEvent(photoId: string, inspectionId: string): APIGatewayProxyEventV2 {
  return {
    requestContext: { http: { method: 'POST' } },
    rawPath: `/photos/${photoId}/analyze`,
    pathParameters: { id: photoId },
    body: JSON.stringify({ inspectionId }),
  } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => { MockGemini.mockClear(); MockPhotoRepo.mockClear(); });

describe('POST /photos/{id}/analyze', () => {
  it('analyzes photo and returns defects', async () => {
    const photo = { id: 'photo-1', inspectionId: 'ins-1', s3Key: 'photos/ins-1/photo-1.jpg', createdAt: '2026-01-01T00:00:00Z' };
    const analysis = { defects: [{ type: 'rust' as const, severity: 'medium' as const, confidence: 0.9, location: 'left' }], summary: 'Rust found.' };
    MockPhotoRepo.prototype.findById.mockResolvedValue(photo);
    MockGemini.prototype.analyzeImage.mockResolvedValue(analysis);
    MockPhotoRepo.prototype.saveAnalysis.mockResolvedValue();

    const res = await handler(makeEvent('photo-1', 'ins-1'));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.defects).toHaveLength(1);
    expect(body.defects[0].type).toBe('rust');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/handlers/analyze.handler.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Implement analyze.handler.ts**

```typescript
// backend/src/handlers/analyze.handler.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '../shared/s3.client';
import { PhotoRepo } from '../repositories/photo.repo';
import { GeminiService } from '../services/gemini.service';
import { DefectAnalysis } from '../shared/types';

const TABLE = process.env.TABLE_NAME!;
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const photoId = event.pathParameters?.id;
  if (!photoId) return json(400, { message: 'photoId required' });

  const { inspectionId } = JSON.parse(event.body ?? '{}');
  if (!inspectionId) return json(400, { message: 'inspectionId required' });

  const repo = new PhotoRepo(TABLE);
  const gemini = new GeminiService(GEMINI_API_KEY);

  try {
    const photo = await repo.findById(photoId, inspectionId);
    if (!photo) return json(404, { message: 'Photo not found' });

    const imageUrl = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: PHOTOS_BUCKET, Key: photo.s3Key }),
      { expiresIn: 60 }
    );

    const { defects, summary } = await gemini.analyzeImage(imageUrl);

    const analysis: DefectAnalysis = {
      photoId,
      defects,
      summary,
      analyzedAt: new Date().toISOString(),
    };

    await repo.saveAnalysis(photoId, analysis);
    return json(200, analysis);
  } catch (err) {
    console.error(err);
    return json(500, { message: 'Internal server error' });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest tests/handlers/analyze.handler.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/handlers/analyze.handler.ts backend/tests/handlers/analyze.handler.test.ts
git commit -m "feat: add analyze handler — Gemini photo analysis + DynamoDB persistence"
```

---

## Task 13: PDF service

**Files:**
- Create: `backend/src/services/pdf.service.ts`
- Create: `backend/tests/services/pdf.service.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/services/pdf.service.test.ts
import { PdfService } from '../../src/services/pdf.service';
import { Equipment, Inspection, ChecklistItem, Photo, DefectAnalysis } from '../../src/shared/types';

describe('PdfService.generate', () => {
  const equipment: Equipment = { id: 'eq-1', name: 'Compressor A', type: 'maintenance', location: 'Sala 1', createdAt: '2026-01-01T00:00:00Z' };
  const inspection: Inspection = { id: 'ins-1', equipmentId: 'eq-1', inspector: 'João Silva', notes: 'Inspeção rotineira.', status: 'completed', createdAt: '2026-01-01T10:00:00Z' };
  const checklist: ChecklistItem[] = [
    { id: 'ci-1', inspectionId: 'ins-1', label: 'Nível de óleo adequado', category: 'Lubrificação', checked: true },
    { id: 'ci-2', inspectionId: 'ins-1', label: 'Vibração dentro do normal', category: 'Vibrações', checked: false },
  ];
  const photos: Photo[] = [{ id: 'photo-1', inspectionId: 'ins-1', s3Key: 'photos/ins-1/photo-1.jpg', createdAt: '2026-01-01T10:05:00Z' }];
  const analyses: DefectAnalysis[] = [{ photoId: 'photo-1', defects: [{ type: 'rust', severity: 'medium', confidence: 0.87, location: 'bottom' }], summary: 'Rust detected.', analyzedAt: '2026-01-01T10:06:00Z' }];

  it('returns a Buffer (PDF binary)', async () => {
    const service = new PdfService();
    const buffer = await service.generate({ equipment, inspection, checklist, photos, analyses });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('PDF starts with %PDF header', async () => {
    const service = new PdfService();
    const buffer = await service.generate({ equipment, inspection, checklist, photos, analyses });
    expect(buffer.toString('ascii', 0, 4)).toBe('%PDF');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/services/pdf.service.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Implement pdf.service.ts**

```typescript
// backend/src/services/pdf.service.ts
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ChecklistItem, DefectAnalysis, Equipment, Inspection, Photo } from '../shared/types';

const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

interface ReportInput {
  equipment: Equipment;
  inspection: Inspection;
  checklist: ChecklistItem[];
  photos: Photo[];
  analyses: DefectAnalysis[];
}

export class PdfService {
  async generate(input: ReportInput): Promise<Buffer> {
    const { equipment, inspection, checklist, analyses } = input;
    const failedItems = checklist.filter(i => !i.checked);
    const allDefects = analyses.flatMap(a => a.defects);
    const maxSeverity = allDefects.length > 0
      ? (['critical', 'high', 'medium', 'low'] as const).find(s => allDefects.some(d => d.severity === s)) ?? 'low'
      : 'N/A';

    const categories = [...new Set(checklist.map(i => i.category))];

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'RELATÓRIO DE INSPEÇÃO INDUSTRIAL', style: 'header' },
        { text: `Equipamento: ${equipment.name}`, style: 'subheader' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Tipo', equipment.type],
              ['Localização', equipment.location],
              ['Inspetor', inspection.inspector],
              ['Data', new Date(inspection.createdAt).toLocaleString('pt-BR')],
              ['Status', inspection.status === 'completed' ? 'Concluída' : 'Aberta'],
              ['ID da Inspeção', inspection.id],
            ],
          },
          margin: [0, 10, 0, 20],
        },
        { text: 'CHECKLIST DE INSPEÇÃO', style: 'sectionHeader' },
        ...categories.map(cat => [
          { text: cat, style: 'categoryHeader' },
          {
            ul: checklist
              .filter(i => i.category === cat)
              .map(i => ({ text: `${i.checked ? '✓' : '✗'} ${i.label}`, color: i.checked ? '#2e7d32' : '#c62828' })),
          },
        ]).flat(),
        { text: '\nRESUMO DE DEFEITOS', style: 'sectionHeader', margin: [0, 20, 0, 0] },
        {
          table: {
            widths: ['*', 'auto', 'auto', '*'],
            body: [
              ['Tipo', 'Severidade', 'Confiança', 'Localização'],
              ...allDefects.map(d => [d.type, d.severity, `${Math.round(d.confidence * 100)}%`, d.location]),
            ],
          },
        },
        {
          text: `\nSeveridade máxima: ${maxSeverity} | Total de defeitos: ${allDefects.length} | Itens reprovados: ${failedItems.length}`,
          margin: [0, 10, 0, 10],
        },
        inspection.notes ? { text: `Observações: ${inspection.notes}`, italics: true } : {},
        { text: `\nRelatório gerado em: ${new Date().toLocaleString('pt-BR')} | ID: ${inspection.id}`, fontSize: 8, color: '#757575', margin: [0, 30, 0, 0] },
      ],
      styles: {
        header: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
        subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] },
        sectionHeader: { fontSize: 13, bold: true, decoration: 'underline', margin: [0, 10, 0, 8] },
        categoryHeader: { fontSize: 11, bold: true, margin: [0, 6, 0, 3] },
      },
    };

    return new Promise((resolve, reject) => {
      const printer = new PdfPrinter(FONTS);
      const doc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest tests/services/pdf.service.test.ts --no-coverage
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/pdf.service.ts backend/tests/services/pdf.service.test.ts
git commit -m "feat: add PDF generation service using pdfmake"
```

---

## Task 14: Report handler

**Files:**
- Create: `backend/src/handlers/report.handler.ts`
- Create: `backend/tests/handlers/report.handler.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/handlers/report.handler.test.ts
import { handler } from '../../src/handlers/report.handler';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

jest.mock('../../src/repositories/equipment.repo');
jest.mock('../../src/repositories/inspection.repo');
jest.mock('../../src/repositories/photo.repo');
jest.mock('../../src/services/pdf.service');
jest.mock('@aws-sdk/client-s3');
jest.mock('../../src/shared/s3.client', () => ({ getS3Client: jest.fn().mockReturnValue({}) }));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/report.pdf'),
}));

import { EquipmentRepo } from '../../src/repositories/equipment.repo';
import { InspectionRepo } from '../../src/repositories/inspection.repo';
import { PhotoRepo } from '../../src/repositories/photo.repo';
import { PdfService } from '../../src/services/pdf.service';

const equipment = { id: 'eq-1', name: 'Comp A', type: 'maintenance' as const, location: 'L', createdAt: '2026-01-01T00:00:00Z' };
const inspection = { id: 'ins-1', equipmentId: 'eq-1', inspector: 'João', notes: '', status: 'open' as const, createdAt: '2026-01-01T00:00:00Z' };

beforeEach(() => {
  (EquipmentRepo as jest.MockedClass<typeof EquipmentRepo>).mockClear();
  (InspectionRepo as jest.MockedClass<typeof InspectionRepo>).prototype.findById.mockResolvedValue(inspection);
  (EquipmentRepo as jest.MockedClass<typeof EquipmentRepo>).prototype.findById.mockResolvedValue(equipment);
  (InspectionRepo as jest.MockedClass<typeof InspectionRepo>).prototype.getChecklist.mockResolvedValue([]);
  (PhotoRepo as jest.MockedClass<typeof PhotoRepo>).prototype.listByInspection.mockResolvedValue([]);
  (PhotoRepo as jest.MockedClass<typeof PhotoRepo>).prototype.getAnalysis.mockResolvedValue(null);
  (PdfService as jest.MockedClass<typeof PdfService>).prototype.generate.mockResolvedValue(Buffer.from('%PDF-1.4'));
});

describe('POST /inspections/{id}/report', () => {
  it('returns 200 with downloadUrl', async () => {
    const event = {
      requestContext: { http: { method: 'POST' } },
      rawPath: '/inspections/ins-1/report',
      pathParameters: { id: 'ins-1' },
      body: undefined,
    } as unknown as APIGatewayProxyEventV2;

    const res = await handler(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.downloadUrl).toBe('https://s3.example.com/report.pdf');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest tests/handlers/report.handler.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Implement report.handler.ts**

```typescript
// backend/src/handlers/report.handler.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '../shared/s3.client';
import { EquipmentRepo } from '../repositories/equipment.repo';
import { InspectionRepo } from '../repositories/inspection.repo';
import { PhotoRepo } from '../repositories/photo.repo';
import { PdfService } from '../services/pdf.service';

const TABLE = process.env.TABLE_NAME!;
const PDFS_BUCKET = process.env.PDFS_BUCKET!;

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const inspectionId = event.pathParameters?.id;
  if (!inspectionId) return json(400, { message: 'inspectionId required' });

  const inspectionRepo = new InspectionRepo(TABLE);
  const equipmentRepo = new EquipmentRepo(TABLE);
  const photoRepo = new PhotoRepo(TABLE);
  const pdfService = new PdfService();

  try {
    const inspection = await inspectionRepo.findById(inspectionId);
    if (!inspection) return json(404, { message: 'Inspection not found' });

    const [equipment, checklist, photos] = await Promise.all([
      equipmentRepo.findById(inspection.equipmentId),
      inspectionRepo.getChecklist(inspectionId),
      photoRepo.listByInspection(inspectionId),
    ]);

    if (!equipment) return json(404, { message: 'Equipment not found' });

    const analyses = await Promise.all(photos.map(p => photoRepo.getAnalysis(p.id)));
    const validAnalyses = analyses.filter((a): a is NonNullable<typeof a> => a !== null);

    const pdfBuffer = await pdfService.generate({ equipment, inspection, checklist, photos, analyses: validAnalyses });

    const pdfKey = `reports/${inspectionId}.pdf`;
    await getS3Client().send(
      new PutObjectCommand({ Bucket: PDFS_BUCKET, Key: pdfKey, Body: pdfBuffer, ContentType: 'application/pdf' })
    );

    const downloadUrl = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: PDFS_BUCKET, Key: pdfKey }),
      { expiresIn: 3600 }
    );

    return json(200, { downloadUrl, pdfKey });
  } catch (err) {
    console.error(err);
    return json(500, { message: 'Internal server error' });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest tests/handlers/report.handler.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Run full backend test suite**

```bash
cd backend && npx jest --no-coverage
```

Expected: all tests PASS, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add backend/src/handlers/report.handler.ts backend/tests/handlers/report.handler.test.ts
git commit -m "feat: add report handler — PDF generation and S3 upload"
```

---

## Task 15: AWS CDK Infrastructure

**Files:**
- Create: `infra/package.json`
- Create: `infra/tsconfig.json`
- Create: `infra/cdk.json`
- Create: `infra/bin/app.ts`
- Create: `infra/lib/inspection-stack.ts`

- [ ] **Step 1: Create infra/package.json**

```json
{
  "name": "infra",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "cdk": "cdk",
    "deploy": "cdk deploy --require-approval never",
    "diff": "cdk diff",
    "synth": "cdk synth"
  },
  "dependencies": {
    "aws-cdk-lib": "^2.140.0",
    "constructs": "^10.0.0"
  },
  "devDependencies": {
    "aws-cdk": "^2.140.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: Create infra/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "cdk.out/.ts",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "exclude": ["node_modules", "cdk.out"]
}
```

- [ ] **Step 3: Create infra/cdk.json**

```json
{
  "app": "npx ts-node bin/app.ts",
  "context": {
    "@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId": true
  }
}
```

- [ ] **Step 4: Create infra/bin/app.ts**

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InspectionStack } from '../lib/inspection-stack';

const app = new cdk.App();
new InspectionStack(app, 'InspectionStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1' },
});
```

- [ ] **Step 5: Create infra/lib/inspection-stack.ts**

```typescript
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export class InspectionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB single table
    const table = new dynamodb.Table(this, 'InspectionTable', {
      tableName: 'InspectionTable',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI1-status-createdAt',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    table.addGlobalSecondaryIndex({
      indexName: 'GSI2-equipmentId-createdAt',
      partitionKey: { name: 'equipmentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // S3 buckets
    const photosBucket = new s3.Bucket(this, 'PhotosBucket', {
      cors: [{
        allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const pdfsBucket = new s3.Bucket(this, 'PdfsBucket', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Cognito
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: { minLength: 8, requireUppercase: true, requireDigits: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: { userPassword: true, userSrp: true },
    });

    // Lambda env shared
    const lambdaEnv = {
      TABLE_NAME: table.tableName,
      PHOTOS_BUCKET: photosBucket.bucketName,
      PDFS_BUCKET: pdfsBucket.bucketName,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
    };

    const backendPath = path.join(__dirname, '../../backend');

    function makeFunction(id: string, entry: string): lambdaNode.NodejsFunction {
      const fn = new lambdaNode.NodejsFunction(this, id, {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(backendPath, entry),
        handler: 'handler',
        environment: lambdaEnv,
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        bundling: { minify: true, sourceMap: false },
      });
      table.grantReadWriteData(fn);
      photosBucket.grantReadWrite(fn);
      pdfsBucket.grantReadWrite(fn);
      return fn;
    }

    const equipmentFn = makeFunction.call(this, 'EquipmentFn', 'src/handlers/equipment.handler.ts');
    const inspectionFn = makeFunction.call(this, 'InspectionFn', 'src/handlers/inspection.handler.ts');
    const photoFn = makeFunction.call(this, 'PhotoFn', 'src/handlers/photo.handler.ts');
    const analyzeFn = makeFunction.call(this, 'AnalyzeFn', 'src/handlers/analyze.handler.ts');
    const reportFn = makeFunction.call(this, 'ReportFn', 'src/handlers/report.handler.ts');

    // API Gateway
    const api = new apigwv2.HttpApi(this, 'InspectionApi', {
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
    });

    const authorizer = new authorizers.HttpUserPoolAuthorizer('CognitoAuth', userPool, {
      userPoolClients: [userPoolClient],
    });

    const authOptions = { authorizer };

    api.addRoutes({ path: '/equipments', methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST], integration: new integrations.HttpLambdaIntegration('EquipInt', equipmentFn), ...authOptions });
    api.addRoutes({ path: '/equipments/{id}', methods: [apigwv2.HttpMethod.GET], integration: new integrations.HttpLambdaIntegration('EquipByIdInt', equipmentFn), ...authOptions });
    api.addRoutes({ path: '/equipments/{id}/history', methods: [apigwv2.HttpMethod.GET], integration: new integrations.HttpLambdaIntegration('EquipHistInt', equipmentFn), ...authOptions });
    api.addRoutes({ path: '/inspections', methods: [apigwv2.HttpMethod.POST], integration: new integrations.HttpLambdaIntegration('InsInt', inspectionFn), ...authOptions });
    api.addRoutes({ path: '/inspections/{id}', methods: [apigwv2.HttpMethod.GET], integration: new integrations.HttpLambdaIntegration('InsByIdInt', inspectionFn), ...authOptions });
    api.addRoutes({ path: '/inspections/{id}/checklist', methods: [apigwv2.HttpMethod.PUT], integration: new integrations.HttpLambdaIntegration('ChecklistInt', inspectionFn), ...authOptions });
    api.addRoutes({ path: '/inspections/{id}/report', methods: [apigwv2.HttpMethod.POST], integration: new integrations.HttpLambdaIntegration('ReportInt', reportFn), ...authOptions });
    api.addRoutes({ path: '/photos/presigned-url', methods: [apigwv2.HttpMethod.GET], integration: new integrations.HttpLambdaIntegration('PhotoInt', photoFn), ...authOptions });
    api.addRoutes({ path: '/photos/{id}/analyze', methods: [apigwv2.HttpMethod.POST], integration: new integrations.HttpLambdaIntegration('AnalyzeInt', analyzeFn), ...authOptions });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'PhotosBucketName', { value: photosBucket.bucketName });
  }
}
```

- [ ] **Step 6: Install infra dependencies**

```bash
cd infra && yarn install
```

- [ ] **Step 7: Verify CDK synth (before deploying)**

```bash
cd infra && GEMINI_API_KEY=placeholder npx cdk synth
```

Expected: CloudFormation template printed to stdout, no errors.

- [ ] **Step 8: Bootstrap AWS (only needed once per account/region)**

```bash
cd infra && npx cdk bootstrap
```

Expected: `✅ Environment aws://ACCOUNT/us-east-1 bootstrapped.`

- [ ] **Step 9: Set Gemini API key and deploy**

Get a free Gemini API key at: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

```bash
cd infra && GEMINI_API_KEY=your_key_here npx cdk deploy
```

Expected output includes:
```
✅  InspectionStack
Outputs:
InspectionStack.ApiUrl = https://xxxx.execute-api.us-east-1.amazonaws.com
InspectionStack.UserPoolId = us-east-1_xxxx
InspectionStack.UserPoolClientId = xxxx
InspectionStack.PhotosBucketName = inspectionstack-photosbucket-xxxx
```

Save these values — the frontend plan needs them.

- [ ] **Step 10: Commit**

```bash
git add infra/
git commit -m "feat: AWS CDK stack — DynamoDB, S3, Cognito, API Gateway, Lambda"
```

---

## Task 16: Smoke test the deployed API

- [ ] **Step 1: Create a test user in Cognito**

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username test@example.com \
  --temporary-password Temp1234! \
  --message-action SUPPRESS
```

- [ ] **Step 2: Get an auth token**

```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=test@example.com,PASSWORD=Temp1234! \
  --client-id <UserPoolClientId>
```

Copy the `IdToken` from the response.

- [ ] **Step 3: Test equipment creation**

```bash
curl -X POST <ApiUrl>/equipments \
  -H "Authorization: Bearer <IdToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Compressor A","type":"maintenance","location":"Sala 1"}'
```

Expected: `201` with `{"id":"...","name":"Compressor A",...}`

- [ ] **Step 4: Test inspection creation**

```bash
curl -X POST <ApiUrl>/inspections \
  -H "Authorization: Bearer <IdToken>" \
  -H "Content-Type: application/json" \
  -d '{"equipmentId":"<id-from-step-3>","equipmentType":"maintenance","inspector":"João","notes":""}'
```

Expected: `201` with inspection object and checklist array.

- [ ] **Step 5: Commit smoke test results as a note**

```bash
git commit --allow-empty -m "chore: backend smoke tests passed on deployed API"
```

---

## CI/CD — GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    name: Backend — Lint + Test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
          cache-dependency-path: backend/yarn.lock
      - run: yarn install --frozen-lockfile
      - run: yarn lint
      - run: yarn test --coverage --passWithNoTests

  infra:
    name: Infrastructure — CDK Synth
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra
    env:
      GEMINI_API_KEY: placeholder
      AWS_DEFAULT_REGION: us-east-1
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
          cache-dependency-path: infra/yarn.lock
      - run: yarn install --frozen-lockfile
      - run: npx cdk synth
```

- [ ] **Step 2: Commit workflow**

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflow for backend lint, test, CDK synth"
git push origin main
```

- [ ] **Step 3: Verify CI passes on GitHub**

Navigate to `github.com/theus-santos/industrial-inspection-ai/actions` and confirm green build.

---

*Backend + Infrastructure complete. Proceed to `2026-05-17-frontend.md` for the Angular implementation.*
