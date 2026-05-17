# App de Inspeção Industrial Inteligente — Design Spec

**Data:** 2026-05-17  
**Autor:** Matheus Almeida dos Santos  
**Status:** Aprovado

---

## 1. Visão Geral

App web para inspeção industrial com IA, voltado para manutenção, solda, estruturas e equipamentos. Permite que inspetores realizem checklists técnicos, fotografem defeitos, recebam análise automática por IA e gerem relatórios PDF. Histórico completo por equipamento.

**Objetivo do projeto:** portfólio técnico demonstrando domínio de Angular + Node.js + AWS (Lambda, DynamoDB, S3, Cognito, API Gateway).

---

## 2. Domínio / Casos de Uso

### Tipos de equipamento suportados
- Manutenção
- Solda
- Estruturas
- Equipamentos gerais

### Defeitos detectados pela IA
- Trincas
- Ferrugem
- Vazamentos
- Desgaste
- Falhas de solda
- Peças danificadas
- Parafusos soltos
- Deformações
- Riscos de segurança

### Fluxo principal
1. Inspetor autentica via Cognito
2. Seleciona ou cadastra equipamento
3. Inicia inspeção → preenche checklist por categoria
4. Fotografa pontos de inspeção → IA analisa defeitos automaticamente
5. Revisa resultado da IA (confirma/descarta defeitos)
6. Gera relatório PDF
7. Consulta histórico do equipamento

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND                          │
│   Angular 17 (standalone) + Angular Material        │
│   Hosted: AWS Amplify Hosting (S3 + CloudFront)     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│         API Gateway (HTTP API) + Cognito Authorizer  │
└──┬──────────────┬──────────────┬────────────────────┘
   │              │              │
┌──▼──┐      ┌───▼───┐     ┌────▼────┐
│Lambda│     │Lambda │     │ Lambda  │
│CRUD  │     │Analyze│     │ Report  │
│Equip/│     │Photo  │     │ PDF Gen │
│Insp. │     │(IA)   │     │         │
└──┬──┘      └───┬───┘     └────┬────┘
   │              │              │
┌──▼──────────────▼──────────────▼────┐
│        DynamoDB (single table)       │
└──────────────────────────────────────┘
        │                    │
┌───────▼──────┐    ┌────────▼───────┐
│  S3 (fotos)  │    │  S3 (PDFs)     │
│  presigned   │    │  gerados       │
│  URL upload  │    │                │
└──────────────┘    └────────────────┘
        │
┌───────▼──────────────────────┐
│  Gemini Flash API (grátis)   │
│  análise de imagem + defeitos│
└──────────────────────────────┘
```

### Serviços AWS
| Serviço | Uso |
|---------|-----|
| Amplify Hosting | Serve Angular SPA (S3 + CloudFront) |
| API Gateway HTTP API | Roteamento de requisições para Lambda |
| Lambda (Node.js/TS) | 3 funções: CRUD, AnalyzePhoto, GenerateReport |
| Cognito User Pool | Autenticação JWT, gratuito até 50k MAU |
| DynamoDB | Banco de dados single-table |
| S3 | Armazenamento de fotos e PDFs gerados |
| CloudWatch | Logs e observabilidade |

### IA externa
- **Google Gemini Flash API** — free tier (15 req/min, 1M tokens/dia)
- Chamada via Lambda `analyzePhoto` com URL presigned da foto

---

## 4. Modelo de Dados (DynamoDB Single Table)

```
PK                    SK                  Atributos principais
──────────────────────────────────────────────────────────────────
EQUIPMENT#<id>        METADATA            name, type, location, createdAt
EQUIPMENT#<id>        INSPECTION#<ts>     status, inspector, createdAt
INSPECTION#<id>       METADATA            equipmentId, notes, status
INSPECTION#<id>       CHECKLIST#<itemId>  label, checked, category
INSPECTION#<id>       PHOTO#<id>          s3Key, analyzedAt
PHOTO#<id>            ANALYSIS            defects[], severity, aiRaw
```

### Global Secondary Indexes
- `GSI1: status-createdAt` — listar inspeções por status (aberta/concluída)
- `GSI2: equipmentId-createdAt` — histórico por equipamento

### Checklist dinâmico por tipo de equipamento
Itens são hardcoded no backend por tipo (v1). Não há configuração de checklist pelo usuário.

| Tipo | Categorias / Itens |
|------|-------------------|
| Manutenção | Lubrificação, Vibrações, Temperatura, Parafusos soltos |
| Solda | Trincas, Falhas de solda, Deformações |
| Estruturas | Ferrugem, Desgaste, Riscos de segurança |
| Equipamentos | Peças danificadas, Vazamentos, Deformações |

---

## 5. Fluxo de Upload de Foto e Análise IA

```
1. Usuário seleciona/tira foto no browser
2. Frontend GET /photos/presigned-url → Lambda retorna { uploadUrl, photoId, s3Key }
3. Frontend faz PUT direto no S3 usando uploadUrl (sem passar pelo Lambda)
4. Frontend POST /photos/{photoId}/analyze → Lambda analyzePhoto
5. Lambda gera presigned GET URL da foto
6. Lambda chama Gemini Flash:
   - Input: URL da foto
   - Prompt estruturado para retornar JSON com defeitos detectados
   - Output: { defects: [{ type, severity, confidence, location }] }
7. Lambda salva resultado em DynamoDB (PHOTO#id → ANALYSIS)
8. Retorna defects ao frontend
9. Frontend exibe overlay de defeitos sobre a foto
```

### Prompt Gemini (base)
```
Analise esta imagem de inspeção industrial.
Identifique a presença dos seguintes tipos de defeito:
trincas, ferrugem, vazamentos, desgaste, falhas de solda,
peças danificadas, parafusos soltos, deformações, riscos de segurança.

Responda exclusivamente em JSON com o formato:
{
  "defects": [
    {
      "type": "<nome do defeito>",
      "severity": "low|medium|high|critical",
      "confidence": 0.0-1.0,
      "location": "<descrição da localização na imagem>"
    }
  ],
  "summary": "<resumo geral da condição>"
}

Se nenhum defeito for encontrado, retorne defects: [].
```

---

## 6. Geração de PDF

Lambda `generateReport` usa **pdfmake** (sem browser, leve em Lambda).

### Estrutura do relatório
```
Relatório de Inspeção Industrial
├── Cabeçalho: equipamento, tipo, localização, data, inspetor
├── Status geral da inspeção
├── Checklist por categoria (✓ OK / ✗ Falha)
├── Registro fotográfico
│   └── Por foto: imagem + tabela de defeitos detectados (tipo, severidade, confiança)
├── Resumo: total de defeitos, severidade máxima, itens críticos
└── Rodapé: data de geração, ID da inspeção
```

### Fluxo de geração
1. Lambda lê inspeção + checklist + fotos + análises do DynamoDB
2. Monta PDF com pdfmake
3. Salva PDF em S3 (`pdfs/<inspectionId>.pdf`)
4. Retorna presigned GET URL (validade 1h) para download direto

---

## 7. Estrutura do Frontend (Angular)

```
src/
├── app/
│   ├── auth/
│   │   ├── login/
│   │   └── auth.guard.ts
│   ├── equipments/
│   │   ├── equipment-list/
│   │   └── equipment-form/
│   ├── inspection/
│   │   ├── checklist/       (form dinâmico por tipo de equipamento)
│   │   ├── photos/          (upload + overlay de defeitos da IA)
│   │   └── report/          (preview resumo + botão download PDF)
│   └── history/             (histórico por equipamento com filtros)
├── core/
│   ├── services/
│   │   ├── api.service.ts
│   │   └── auth.service.ts  (Cognito via AWS Amplify)
│   └── interceptors/        (JWT token injection)
└── shared/
    └── components/          (defect-badge, severity-chip, photo-viewer)
```

### Bibliotecas Angular
- `@aws-amplify/ui-angular` — login Cognito pronto
- `angular/material` — UI components
- `ngx-dropzone` — upload de fotos com drag & drop

---

## 8. Estrutura do Backend (Lambda)

```
src/
├── handlers/
│   ├── equipment.handler.ts   (CRUD equipamentos)
│   ├── inspection.handler.ts  (CRUD inspeções + checklist)
│   ├── photo.handler.ts       (presigned URL + trigger análise)
│   ├── analyze.handler.ts     (integração Gemini + salva resultado)
│   └── report.handler.ts      (geração PDF + upload S3)
├── repositories/
│   ├── equipment.repo.ts
│   ├── inspection.repo.ts
│   └── photo.repo.ts
├── services/
│   ├── gemini.service.ts      (chamada API Gemini Flash)
│   └── pdf.service.ts         (montagem pdfmake)
└── shared/
    ├── dynamo.client.ts
    └── s3.client.ts
```

---

## 9. Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /equipments | Criar equipamento |
| GET | /equipments | Listar equipamentos |
| GET | /equipments/{id}/history | Histórico de inspeções |
| POST | /inspections | Criar inspeção |
| GET | /inspections/{id} | Detalhe da inspeção |
| PUT | /inspections/{id}/checklist | Salvar checklist |
| GET | /photos/presigned-url | URL para upload direto S3 |
| POST | /photos/{id}/analyze | Disparar análise IA |
| POST | /inspections/{id}/report | Gerar PDF |

---

## 10. Testes

- **Unit:** Jest — services e repositories isolados (mock DynamoDB/S3/Gemini)
- **Integration:** Lambda handlers com DynamoDB local (`dynamodb-local`)
- **E2E:** Cypress — fluxo completo: login → equipamento → inspeção → foto → PDF

---

## 11. CI/CD

GitHub Actions:
1. `lint` → ESLint TypeScript
2. `test` → Jest unit + integration
3. `build` → `ng build` (Angular) + `tsc` (Lambda)
4. `deploy:backend` → AWS CDK ou SAM deploy (Lambda + API GW + DynamoDB + S3)
5. `deploy:frontend` → Amplify CLI push

---

## 12. Fora do Escopo (v1)

- App mobile nativo
- Notificações push / e-mail
- Multi-tenant (múltiplas empresas)
- Modo offline
- Exportação para Excel
- Treinamento de modelo de IA próprio
