# InspecAI — Mobile, PDF Fotos & Melhorias — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o InspecAI responsivo no mobile, incluir fotos no PDF, adicionar Dashboard com KPIs, QR Code por equipamento, gráfico de tendência de defeitos e suporte PWA.

**Architecture:** Sequencial por impacto. Frontend e backend são independentes. Cada task produz código funcionando e commitável. Tasks 3 e 6 são backend — deploy CDK é feito uma vez ao final (Task 8). Tasks 1,2,4,5,7,9 são frontend — Amplify auto-deploya a cada push.

**Tech Stack:** Angular 17 standalone, Angular Material CDK BreakpointObserver, `qrcode` npm, `chart.js` v4, `@angular/pwa`, pdfmake, AWS Lambda Node.js 20, DynamoDB, S3 presigned URLs.

---

## Mapa de Arquivos

| Feature | Criar | Modificar |
|---------|-------|-----------|
| Mobile | — | `app.component.ts`, `app.component.html`, `styles.scss`, `equipment-list.component.ts/html` |
| PDF fotos | — | `report.handler.ts`, `pdf.service.ts` |
| Dashboard | `dashboard/dashboard.component.ts/html` | `app.routes.ts`, `app.component.html`, `api.service.ts` |
| QR Code | `shared/qr-dialog/qr-dialog.component.ts/html` | `equipment-list.component.ts/html` |
| Trend backend | — | `shared/types.ts`, `inspection.repo.ts`, `report.handler.ts` |
| Trend frontend | — | `history.component.ts/html`, `api.service.ts` |
| PWA | `src/manifest.webmanifest`, `ngsw-config.json` | `angular.json`, `app.config.ts` |

---

## Task 1: Mobile — Drawer responsivo + Bottom Nav (AppComponent)

**Files:**
- Modify: `frontend/src/app/app.component.ts`
- Modify: `frontend/src/app/app.component.html`

- [ ] **Step 1: Atualizar `app.component.ts` com BreakpointObserver**

`@angular/cdk` já está instalado (Material depende dele). Substituir o conteúdo completo:

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  activeRoute = '';
  userInitials = 'US';
  isMobile = false;
  private bpSub?: Subscription;

  constructor(
    public auth: AuthService,
    private router: Router,
    private bp: BreakpointObserver,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.auth.checkSession();
    this.bpSub = this.bp.observe(Breakpoints.Handset).subscribe(r => {
      this.isMobile = r.matches;
    });
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.activeRoute = e.urlAfterRedirects;
    });
  }

  ngOnDestroy(): void { this.bpSub?.unsubscribe(); }

  isActive(path: string): boolean { return this.activeRoute.startsWith(path); }
  navigate(path: string): void { this.router.navigate([path]); }
  async logout(): Promise<void> { await this.auth.logout(); }
}
```

- [ ] **Step 2: Atualizar `app.component.html` com drawer responsivo e bottom nav**

Substituir o conteúdo completo:

```html
<mat-drawer-container style="height:100vh">

  <mat-drawer
    [mode]="isMobile ? 'over' : 'side'"
    [opened]="!isMobile && auth.isAuthenticated()"
    style="width:220px;background:#0d1b2a;border:none">

    <!-- Logo -->
    <div style="padding:20px 16px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px">
      <div style="width:32px;height:32px;background:#2196f3;border-radius:6px;display:flex;align-items:center;justify-content:center">
        <mat-icon style="color:white;font-size:18px;width:18px;height:18px">settings</mat-icon>
      </div>
      <div>
        <div style="color:white;font-size:13px;font-weight:700;line-height:1.2">Inspeção</div>
        <div style="color:#64b5f6;font-size:11px;line-height:1.2">Industrial IA</div>
      </div>
    </div>

    <!-- Nav links -->
    <div style="flex:1;padding:8px 0">
      <div class="nav-item" [class.nav-active]="isActive('/dashboard')" (click)="navigate('/dashboard')">
        <mat-icon class="nav-icon">dashboard</mat-icon>
        <span class="nav-label">Dashboard</span>
      </div>
      <div class="nav-item" [class.nav-active]="isActive('/equipments') && !isActive('/equipments/new')" (click)="navigate('/equipments')">
        <mat-icon class="nav-icon">precision_manufacturing</mat-icon>
        <span class="nav-label">Equipamentos</span>
      </div>
      <div class="nav-item" [class.nav-active]="isActive('/equipments/new')" (click)="navigate('/equipments/new')">
        <mat-icon class="nav-icon">add_circle_outline</mat-icon>
        <span class="nav-label">Novo Equipamento</span>
      </div>
    </div>

    <!-- User + logout -->
    <div style="border-top:1px solid rgba(255,255,255,.08);padding:12px 16px;display:flex;align-items:center;gap:10px;margin-top:auto">
      <div style="width:30px;height:30px;border-radius:50%;background:#2196f3;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;flex-shrink:0">
        {{ userInitials }}
      </div>
      <div style="flex:1;min-width:0">
        <div style="color:#e0e0e0;font-size:12px;font-weight:500">Inspector</div>
      </div>
      <mat-icon style="color:#546e7a;cursor:pointer;font-size:18px" matTooltip="Sair" (click)="logout()">logout</mat-icon>
    </div>

  </mat-drawer>

  <mat-drawer-content>
    <div [class]="isMobile && auth.isAuthenticated() ? 'content-mobile' : !isMobile && auth.isAuthenticated() ? 'content-desktop' : ''">
      <router-outlet></router-outlet>
    </div>

    <!-- Bottom Nav (mobile only) -->
    <nav class="bottom-nav" *ngIf="isMobile && auth.isAuthenticated()">
      <div class="bottom-nav-item" [class.bnav-active]="isActive('/dashboard')" (click)="navigate('/dashboard')">
        <mat-icon>dashboard</mat-icon>
        <span>Início</span>
      </div>
      <div class="bottom-nav-item" [class.bnav-active]="isActive('/equipments') && !isActive('/equipments/new')" (click)="navigate('/equipments')">
        <mat-icon>precision_manufacturing</mat-icon>
        <span>Equipamentos</span>
      </div>
      <div class="bottom-nav-item" [class.bnav-active]="isActive('/equipments/new')" (click)="navigate('/equipments/new')">
        <mat-icon>add_circle</mat-icon>
        <span>Novo</span>
      </div>
    </nav>
  </mat-drawer-content>

</mat-drawer-container>
```

- [ ] **Step 3: Adicionar CSS do bottom nav e classes de conteúdo em `frontend/src/styles.scss`**

Adicionar ao final do arquivo:

```scss
/* Mobile layout */
.content-desktop {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.content-mobile {
  padding: 12px;
  padding-bottom: 72px; /* espaço para o bottom nav */
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #0d1b2a;
  display: flex;
  align-items: center;
  justify-content: space-around;
  box-shadow: 0 -2px 8px rgba(0,0,0,.2);
  z-index: 100;
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  color: #546e7a;
  padding: 4px 16px;

  mat-icon { font-size: 22px; width: 22px; height: 22px; }
  span { font-size: 10px; }
}

.bnav-active {
  color: #64b5f6 !important;
}

/* Utilitários responsivos */
@media (max-width: 768px) {
  .hide-mobile { display: none !important; }
}
@media (min-width: 769px) {
  .hide-desktop { display: none !important; }
}
```

- [ ] **Step 4: Verificar no browser em viewport mobile (DevTools → Toggle device toolbar)**

Abrir `http://localhost:4200`, redimensionar para 375px de largura. Esperar ver:
- Sidebar desaparece
- Bottom nav aparece na base
- Conteúdo tem padding reduzido

- [ ] **Step 5: Commit**

```bash
cd /home/theusant/projects/industrial-inspection-ai
git add frontend/src/app/app.component.ts frontend/src/app/app.component.html frontend/src/styles.scss
git commit -m "feat: responsive mobile layout with bottom navigation"
```

---

## Task 2: Mobile — Equipment-list kebab menu

**Files:**
- Modify: `frontend/src/app/equipments/equipment-list/equipment-list.component.ts`
- Modify: `frontend/src/app/equipments/equipment-list/equipment-list.component.html`

- [ ] **Step 1: Adicionar `MatMenuModule` ao component**

Em `equipment-list.component.ts`, adicionar `MatMenuModule` aos imports:

```typescript
import { MatMenuModule } from '@angular/material/menu';

// no @Component imports array, adicionar MatMenuModule:
imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatTooltipModule, MatDialogModule, MatMenuModule],
```

- [ ] **Step 2: Atualizar o template `equipment-list.component.html`**

Substituir a linha de botões de cada equipamento (o bloco que tem os 3 botões de ação). Localizar:
```html
    <button mat-raised-button color="primary" (click)="inspect(eq.id)" style="flex-shrink:0;font-size:12px">
      Inspecionar
    </button>
    <button mat-icon-button matTooltip="Histórico" (click)="history(eq.id)" style="flex-shrink:0">
      <mat-icon style="color:#78909c">history</mat-icon>
    </button>
    <button mat-icon-button matTooltip="Excluir" (click)="deleteEquipment(eq.id, eq.name)" style="flex-shrink:0;color:#ef5350">
      <mat-icon>delete</mat-icon>
    </button>
```

Substituir por:
```html
    <button mat-raised-button color="primary" (click)="inspect(eq.id)" style="flex-shrink:0;font-size:12px">
      Inspecionar
    </button>
    <!-- Desktop: botões individuais -->
    <button mat-icon-button matTooltip="Histórico" (click)="history(eq.id)" style="flex-shrink:0" class="hide-mobile">
      <mat-icon style="color:#78909c">history</mat-icon>
    </button>
    <button mat-icon-button matTooltip="Excluir" (click)="deleteEquipment(eq.id, eq.name)" style="flex-shrink:0;color:#ef5350" class="hide-mobile">
      <mat-icon>delete</mat-icon>
    </button>
    <!-- Mobile: kebab menu -->
    <button mat-icon-button [matMenuTriggerFor]="equipMenu" style="flex-shrink:0" class="hide-desktop">
      <mat-icon style="color:#78909c">more_vert</mat-icon>
    </button>
    <mat-menu #equipMenu="matMenu">
      <button mat-menu-item (click)="history(eq.id)">
        <mat-icon>history</mat-icon> Histórico
      </button>
      <button mat-menu-item (click)="deleteEquipment(eq.id, eq.name)" style="color:#ef5350">
        <mat-icon style="color:#ef5350">delete</mat-icon> Excluir
      </button>
    </mat-menu>
```

- [ ] **Step 3: Verificar no browser mobile (375px)**

Esperar ver: botão "Inspecionar" visível + ícone ⋮ que abre menu com Histórico e Excluir.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/equipments/equipment-list/equipment-list.component.ts \
        frontend/src/app/equipments/equipment-list/equipment-list.component.html
git commit -m "feat: equipment list kebab menu on mobile"
```

---

## Task 3: PDF — Fotos no relatório (backend)

**Files:**
- Modify: `backend/src/handlers/report.handler.ts`
- Modify: `backend/src/services/pdf.service.ts`

- [ ] **Step 1: Atualizar `report.handler.ts` para gerar presigned URLs das fotos**

Adicionar `PHOTOS_BUCKET` e geração de URLs. Substituir o conteúdo completo:

```typescript
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
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET!;

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

    const photosWithUrls = await Promise.all(
      photos.map(async photo => {
        const url = await getSignedUrl(
          getS3Client(),
          new GetObjectCommand({ Bucket: PHOTOS_BUCKET, Key: photo.s3Key }),
          { expiresIn: 120 },
        );
        return {
          photo,
          url,
          analysis: validAnalyses.find(a => a.photoId === photo.id),
        };
      })
    );

    const pdfBuffer = await pdfService.generate({
      equipment,
      inspection,
      checklist,
      photos,
      analyses: validAnalyses,
      photosWithUrls,
    });

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

- [ ] **Step 2: Atualizar `pdf.service.ts` com seção de fotos**

Substituir o conteúdo completo:

```typescript
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { ChecklistItem, DefectAnalysis, Equipment, Inspection, Photo } from '../shared/types';

const EQUIPMENT_TYPE_LABEL: Record<string, string> = {
  maintenance: 'Manutencao', welding: 'Solda', structures: 'Estruturas', equipment: 'Equipamento Geral',
};

const DEFECT_LABEL: Record<string, string> = {
  crack: 'Rachadura', rust: 'Ferrugem', leak: 'Vazamento', wear: 'Desgaste',
  weld_failure: 'Falha de Solda', damaged_part: 'Peca Danificada',
  loose_bolt: 'Parafuso Solto', deformation: 'Deformacao', safety_risk: 'Risco de Seguranca',
};

const SEVERITY_LABEL: Record<string, string> = {
  low: 'Baixo', medium: 'Medio', high: 'Alto', critical: 'Critico',
};

const SEVERITY_COLOR_PDF: Record<string, string> = {
  low: '#2e7d32', medium: '#e65100', high: '#c62828', critical: '#b71c1c',
};

const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

interface PhotoWithUrl {
  photo: Photo;
  url: string;
  analysis: DefectAnalysis | undefined;
}

interface ReportInput {
  equipment: Equipment;
  inspection: Inspection;
  checklist: ChecklistItem[];
  photos: Photo[];
  analyses: DefectAnalysis[];
  photosWithUrls: PhotoWithUrl[];
}

export class PdfService {
  async generate(input: ReportInput): Promise<Buffer> {
    const { equipment, inspection, checklist, analyses, photosWithUrls } = input;
    const failedItems = checklist.filter(i => !i.checked);
    const allDefects = analyses.flatMap(a => a.defects);
    const maxSeverity = allDefects.length > 0
      ? (['critical', 'high', 'medium', 'low'] as const).find(s => allDefects.some(d => d.severity === s)) ?? 'low'
      : 'N/A';

    const categories = [...new Set(checklist.map(i => i.category))];

    const checklistContent: Content[] = categories.flatMap(cat => [
      { text: cat, style: 'categoryHeader' } as Content,
      {
        ul: checklist
          .filter(i => i.category === cat)
          .map(i => ({ text: `${i.checked ? '[OK]' : '[REPROV]'} ${i.label}`, color: i.checked ? '#2e7d32' : '#c62828' })),
      } as Content,
    ]);

    const notesContent: Content[] = inspection.notes
      ? [{ text: `Observacoes: ${inspection.notes}`, italics: true }]
      : [];

    const imagesData = await this.fetchImagesAsBase64(photosWithUrls);

    const photoContent: Content[] = photosWithUrls.length > 0
      ? [
          { text: '\nREGISTRO FOTOGRAFICO', style: 'sectionHeader', margin: [0, 20, 0, 8] as [number, number, number, number] } as Content,
          ...imagesData.map(({ idx, data, mimeType }) => {
            const pw = photosWithUrls[idx];
            const defects = pw.analysis?.defects ?? [];
            const summary = pw.analysis?.summary ?? '';
            const defectStack: Content[] = defects.length > 0
              ? defects.map(d => ({
                  text: `${DEFECT_LABEL[d.type] ?? d.type} - ${SEVERITY_LABEL[d.severity] ?? d.severity}`,
                  color: SEVERITY_COLOR_PDF[d.severity] ?? '#333',
                  fontSize: 10,
                  margin: [0, 0, 0, 2] as [number, number, number, number],
                }))
              : [{ text: '[OK] Nenhum defeito detectado', color: '#2e7d32', fontSize: 10 } as Content];

            return {
              table: {
                widths: [175, '*'],
                body: [[
                  { image: `data:${mimeType};base64,${data}`, width: 170 },
                  {
                    stack: [
                      { text: `Foto ${idx + 1}`, bold: true, fontSize: 11, margin: [0, 0, 0, 6] } as Content,
                      ...defectStack,
                      ...(summary ? [{ text: `"${summary}"`, italics: true, color: '#78909c', fontSize: 10, margin: [0, 6, 0, 0] } as Content] : []),
                    ],
                    margin: [8, 0, 0, 0] as [number, number, number, number],
                  },
                ]],
              },
              layout: 'noBorders',
              margin: [0, 0, 0, 12] as [number, number, number, number],
            } as Content;
          }),
        ]
      : [];

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'RELATORIO DE INSPECAO INDUSTRIAL', style: 'header' } as Content,
        { text: `Equipamento: ${equipment.name}`, style: 'subheader' } as Content,
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Tipo', EQUIPMENT_TYPE_LABEL[equipment.type] ?? equipment.type],
              ['Localizacao', equipment.location],
              ['Inspetor', inspection.inspector],
              ['Data', new Date(inspection.createdAt).toLocaleString('pt-BR')],
              ['Status', inspection.status === 'completed' ? 'Concluida' : 'Aberta'],
              ['ID da Inspecao', inspection.id],
            ],
          },
          margin: [0, 10, 0, 20] as [number, number, number, number],
        } as Content,
        { text: 'CHECKLIST DE INSPECAO', style: 'sectionHeader' } as Content,
        ...checklistContent,
        { text: '\nRESUMO DE DEFEITOS', style: 'sectionHeader', margin: [0, 20, 0, 0] as [number, number, number, number] } as Content,
        {
          table: {
            widths: ['*', 'auto', 'auto', '*'],
            body: [
              ['Tipo', 'Severidade', 'Confianca', 'Localizacao'],
              ...allDefects.map(d => [
                DEFECT_LABEL[d.type] ?? d.type,
                SEVERITY_LABEL[d.severity] ?? d.severity,
                `${Math.round(d.confidence * 100)}%`,
                d.location,
              ]),
            ],
          },
        } as Content,
        {
          text: `\nSeveridade maxima: ${SEVERITY_LABEL[maxSeverity] ?? maxSeverity} | Total de defeitos: ${allDefects.length} | Itens reprovados: ${failedItems.length}`,
          margin: [0, 10, 0, 10] as [number, number, number, number],
        } as Content,
        ...notesContent,
        ...photoContent,
        { text: `\nRelatorio gerado em: ${new Date().toLocaleString('pt-BR')} | ID: ${inspection.id}`, fontSize: 8, color: '#757575', margin: [0, 30, 0, 0] as [number, number, number, number] } as Content,
      ],
      styles: {
        header: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 10] as [number, number, number, number] },
        subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
        sectionHeader: { fontSize: 13, bold: true, decoration: 'underline', margin: [0, 10, 0, 8] as [number, number, number, number] },
        categoryHeader: { fontSize: 11, bold: true, margin: [0, 6, 0, 3] as [number, number, number, number] },
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

  private async fetchImagesAsBase64(
    photosWithUrls: PhotoWithUrl[],
  ): Promise<Array<{ idx: number; data: string; mimeType: string }>> {
    return Promise.all(
      photosWithUrls.map(async ({ url }, idx) => {
        try {
          const response = await fetch(url);
          const mimeType = response.headers.get('content-type') ?? 'image/jpeg';
          const buffer = await response.arrayBuffer();
          return { idx, data: Buffer.from(buffer).toString('base64'), mimeType };
        } catch {
          return { idx, data: '', mimeType: 'image/jpeg' };
        }
      })
    );
  }
}
```

- [ ] **Step 3: Commit (backend — deploy junto com Task 6)**

```bash
git add backend/src/handlers/report.handler.ts backend/src/services/pdf.service.ts
git commit -m "feat: include photos in PDF report"
```

---

## Task 4: Dashboard — Componente, rota e sidebar

**Files:**
- Modify: `frontend/src/app/core/services/api.service.ts`
- Create: `frontend/src/app/dashboard/dashboard.component.ts`
- Create: `frontend/src/app/dashboard/dashboard.component.html`
- Modify: `frontend/src/app/app.routes.ts`

- [ ] **Step 1: Adicionar campos `defectCount` e `maxSeverity` à interface `Inspection` em `api.service.ts`**

Localizar a linha:
```typescript
export interface Inspection { id: string; equipmentId: string; inspector: string; notes: string; status: string; createdAt: string; }
```

Substituir por:
```typescript
export interface Inspection { id: string; equipmentId: string; inspector: string; notes: string; status: string; createdAt: string; defectCount?: number; maxSeverity?: string; }
```

- [ ] **Step 2: Criar `frontend/src/app/dashboard/dashboard.component.ts`**

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ApiService, Inspection } from '../../core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  loading = true;
  totalEquipments = 0;
  totalInspections = 0;
  criticalCount = 0;
  lastInspectionDate: string | null = null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.getEquipments().pipe(
      switchMap(equipments => {
        this.totalEquipments = equipments.length;
        if (equipments.length === 0) return of([] as Inspection[][]);
        return forkJoin(
          equipments.map(eq =>
            this.api.getEquipmentHistory(eq.id).pipe(catchError(() => of([] as Inspection[])))
          )
        );
      })
    ).subscribe(histories => {
      const all = (histories as Inspection[][]).flat();
      this.totalInspections = all.length;
      this.criticalCount = all.filter(i => i.maxSeverity === 'critical').length;
      const sorted = all.map(i => i.createdAt).sort();
      this.lastInspectionDate = sorted[sorted.length - 1] ?? null;
      this.loading = false;
    });
  }

  goToEquipments(): void { this.router.navigate(['/equipments']); }
  newEquipment(): void { this.router.navigate(['/equipments/new']); }
}
```

- [ ] **Step 3: Criar `frontend/src/app/dashboard/dashboard.component.html`**

```html
<div style="max-width:680px;margin:0 auto">
  <div style="margin-bottom:24px">
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#0d1b2a">Dashboard</h1>
    <p style="margin:4px 0 0;color:#78909c;font-size:13px">Visão geral das inspeções</p>
  </div>

  <!-- Skeleton loading -->
  <div *ngIf="loading" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
    <div *ngFor="let i of [1,2,3,4]" class="skeleton" style="height:80px;border-radius:8px"></div>
  </div>

  <!-- KPI Cards -->
  <div *ngIf="!loading" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">

    <div style="background:white;border-radius:8px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <mat-icon style="color:#2196f3">precision_manufacturing</mat-icon>
        <span style="font-size:12px;color:#78909c;font-weight:500">Equipamentos</span>
      </div>
      <div style="font-size:28px;font-weight:700;color:#0d1b2a">{{ totalEquipments }}</div>
    </div>

    <div style="background:white;border-radius:8px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <mat-icon style="color:#4caf50">task_alt</mat-icon>
        <span style="font-size:12px;color:#78909c;font-weight:500">Inspeções</span>
      </div>
      <div style="font-size:28px;font-weight:700;color:#0d1b2a">{{ totalInspections }}</div>
    </div>

    <div style="background:white;border-radius:8px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <mat-icon style="color:#f44336">warning</mat-icon>
        <span style="font-size:12px;color:#78909c;font-weight:500">Críticos</span>
      </div>
      <div style="font-size:28px;font-weight:700" [style.color]="criticalCount > 0 ? '#c62828' : '#0d1b2a'">{{ criticalCount }}</div>
    </div>

    <div style="background:white;border-radius:8px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <mat-icon style="color:#ff9800">schedule</mat-icon>
        <span style="font-size:12px;color:#78909c;font-weight:500">Última Inspeção</span>
      </div>
      <div style="font-size:13px;font-weight:600;color:#0d1b2a">
        {{ lastInspectionDate ? (lastInspectionDate | date:'dd/MM/yyyy') : '—' }}
      </div>
    </div>
  </div>

  <!-- CTAs -->
  <div *ngIf="!loading" style="display:flex;gap:12px;flex-wrap:wrap">
    <button mat-raised-button color="primary" (click)="goToEquipments()"
            style="border-radius:28px;padding:10px 24px;font-weight:600;box-shadow:0 4px 12px rgba(33,150,243,.4)">
      <mat-icon>search</mat-icon> Ver Equipamentos
    </button>
    <button mat-stroked-button color="primary" (click)="newEquipment()" style="border-radius:28px;padding:10px 24px">
      <mat-icon>add</mat-icon> Novo Equipamento
    </button>
  </div>
</div>
```

- [ ] **Step 4: Atualizar `app.routes.ts` para rota dashboard como padrão**

Substituir o conteúdo completo:

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./auth/signup/signup.component').then(m => m.SignupComponent) },
  { path: 'signup/confirm', loadComponent: () => import('./auth/confirm/confirm.component').then(m => m.ConfirmComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'equipments', canActivate: [authGuard], loadComponent: () => import('./equipments/equipment-list/equipment-list.component').then(m => m.EquipmentListComponent) },
  { path: 'equipments/new', canActivate: [authGuard], loadComponent: () => import('./equipments/equipment-form/equipment-form.component').then(m => m.EquipmentFormComponent) },
  { path: 'equipments/:id/history', canActivate: [authGuard], loadComponent: () => import('./history/history.component').then(m => m.HistoryComponent) },
  { path: 'equipments/:id/inspect', canActivate: [authGuard], loadComponent: () => import('./inspection/inspection-create/inspection-create.component').then(m => m.InspectionCreateComponent) },
  { path: 'inspections/:id/checklist', canActivate: [authGuard], loadComponent: () => import('./inspection/checklist/checklist.component').then(m => m.ChecklistComponent) },
  { path: 'inspections/:id/photos', canActivate: [authGuard], loadComponent: () => import('./inspection/photos/photos.component').then(m => m.PhotosComponent) },
  { path: 'inspections/:id/report', canActivate: [authGuard], loadComponent: () => import('./inspection/report/report.component').then(m => m.ReportComponent) },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
```

- [ ] **Step 5: Verificar no browser**

Acessar `http://localhost:4200` → deve redirecionar para `/dashboard` e mostrar os 4 cards de KPI.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/core/services/api.service.ts \
        frontend/src/app/dashboard/ \
        frontend/src/app/app.routes.ts
git commit -m "feat: dashboard with KPI cards"
```

---

## Task 5: QR Code — Dialog + botão no equipment-list

**Files:**
- Create: `frontend/src/app/shared/qr-dialog/qr-dialog.component.ts`
- Create: `frontend/src/app/shared/qr-dialog/qr-dialog.component.html`
- Modify: `frontend/src/app/equipments/equipment-list/equipment-list.component.ts`
- Modify: `frontend/src/app/equipments/equipment-list/equipment-list.component.html`

- [ ] **Step 1: Instalar `qrcode`**

```bash
cd /home/theusant/projects/industrial-inspection-ai/frontend
npm install qrcode @types/qrcode
```

Esperar: `added N packages` sem erros.

- [ ] **Step 2: Criar `frontend/src/app/shared/qr-dialog/qr-dialog.component.ts`**

```typescript
import { Component, Inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './qr-dialog.component.html',
})
export class QrDialogComponent implements AfterViewInit {
  @ViewChild('qrCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { equipmentId: string; name: string },
  ) {}

  async ngAfterViewInit(): Promise<void> {
    const url = `${window.location.origin}/equipments/${this.data.equipmentId}/inspect`;
    await QRCode.toCanvas(this.canvasRef.nativeElement, url, { width: 240, margin: 2 });
  }

  download(): void {
    const dataUrl = this.canvasRef.nativeElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${this.data.name.replace(/\s/g, '-')}.png`;
    a.click();
  }
}
```

- [ ] **Step 3: Criar `frontend/src/app/shared/qr-dialog/qr-dialog.component.html`**

```html
<h2 mat-dialog-title style="font-size:16px;font-weight:700;color:#0d1b2a">QR Code — {{ data.name }}</h2>

<mat-dialog-content style="text-align:center;padding:16px">
  <canvas #qrCanvas style="border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.12)"></canvas>
  <p style="font-size:12px;color:#78909c;margin-top:12px">
    Escaneie para iniciar a inspeção deste equipamento
  </p>
</mat-dialog-content>

<mat-dialog-actions align="end" style="padding:8px 16px 16px">
  <button mat-button mat-dialog-close>Fechar</button>
  <button mat-raised-button color="primary" (click)="download()">
    <mat-icon>download</mat-icon> Baixar PNG
  </button>
</mat-dialog-actions>
```

- [ ] **Step 4: Adicionar `showQr()` em `equipment-list.component.ts`**

Adicionar import do dialog:
```typescript
import { QrDialogComponent } from '../../shared/qr-dialog/qr-dialog.component';
```

Adicionar método na classe (após o método `history()`):
```typescript
  showQr(id: string, name: string): void {
    this.dialog.open(QrDialogComponent, {
      width: '320px',
      data: { equipmentId: id, name },
    });
  }
```

- [ ] **Step 5: Adicionar botão QR no `equipment-list.component.html`**

Após o botão `hide-mobile` de Histórico (desktop), adicionar:
```html
    <button mat-icon-button matTooltip="QR Code" (click)="showQr(eq.id, eq.name)" style="flex-shrink:0" class="hide-mobile">
      <mat-icon style="color:#78909c">qr_code</mat-icon>
    </button>
```

No `mat-menu` mobile (após o item Histórico), adicionar:
```html
      <button mat-menu-item (click)="showQr(eq.id, eq.name)">
        <mat-icon>qr_code</mat-icon> QR Code
      </button>
```

- [ ] **Step 6: Testar — abrir QR dialog e verificar canvas renderizado**

Clicar no ícone QR de um equipamento. Deve abrir dialog com QR Code preto no fundo branco.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/shared/qr-dialog/ \
        frontend/src/app/equipments/equipment-list/equipment-list.component.ts \
        frontend/src/app/equipments/equipment-list/equipment-list.component.html \
        frontend/package.json frontend/package-lock.json
git commit -m "feat: QR code per equipment for mobile inspection"
```

---

## Task 6: Trend — Backend (types + repo + report handler)

**Files:**
- Modify: `backend/src/shared/types.ts`
- Modify: `backend/src/repositories/inspection.repo.ts`
- Modify: `backend/src/handlers/report.handler.ts`

- [ ] **Step 1: Adicionar `defectCount` e `maxSeverity` à interface `Inspection` em `backend/src/shared/types.ts`**

Localizar:
```typescript
export interface Inspection {
  id: string;
  equipmentId: string;
  inspector: string;
  notes: string;
  status: InspectionStatus;
  createdAt: string;
}
```

Substituir por:
```typescript
export interface Inspection {
  id: string;
  equipmentId: string;
  inspector: string;
  notes: string;
  status: InspectionStatus;
  createdAt: string;
  defectCount?: number;
  maxSeverity?: string;
}
```

- [ ] **Step 2: Adicionar `updateSummary()` em `inspection.repo.ts`**

Adicionar import do `UpdateCommand` na linha 1:
```typescript
import { PutCommand, GetCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
```

Adicionar método ao final da classe (antes do `}`):
```typescript
  async updateSummary(id: string, data: { defectCount: number; maxSeverity: string }): Promise<void> {
    await getDocumentClient().send(
      new UpdateCommand({
        TableName: this.table,
        Key: { PK: `INSPECTION#${id}`, SK: 'METADATA' },
        UpdateExpression: 'SET defectCount = :dc, maxSeverity = :ms',
        ExpressionAttributeValues: { ':dc': data.defectCount, ':ms': data.maxSeverity },
      })
    );
  }
```

- [ ] **Step 3: Chamar `updateSummary` em `report.handler.ts` após gerar o PDF**

Adicionar `InspectionRepo` ao handler (já importado). Após o upload do PDF para o S3 e antes do `return json(200, ...)`, adicionar:

```typescript
    const allDefectsForSummary = validAnalyses.flatMap(a => a.defects);
    const maxSeverityValue = allDefectsForSummary.length > 0
      ? (['critical', 'high', 'medium', 'low'] as const).find(s => allDefectsForSummary.some(d => d.severity === s)) ?? 'low'
      : 'none';

    await inspectionRepo.updateSummary(inspectionId, {
      defectCount: allDefectsForSummary.length,
      maxSeverity: maxSeverityValue,
    });
```

O bloco final do handler deve ficar:
```typescript
    const downloadUrl = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: PDFS_BUCKET, Key: pdfKey }),
      { expiresIn: 3600 }
    );

    const allDefectsForSummary = validAnalyses.flatMap(a => a.defects);
    const maxSeverityValue = allDefectsForSummary.length > 0
      ? (['critical', 'high', 'medium', 'low'] as const).find(s => allDefectsForSummary.some(d => d.severity === s)) ?? 'low'
      : 'none';

    await inspectionRepo.updateSummary(inspectionId, {
      defectCount: allDefectsForSummary.length,
      maxSeverity: maxSeverityValue,
    });

    return json(200, { downloadUrl, pdfKey });
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/shared/types.ts \
        backend/src/repositories/inspection.repo.ts \
        backend/src/handlers/report.handler.ts
git commit -m "feat: store defect summary on inspection after report generation"
```

---

## Task 7: Trend — Frontend chart (history component)

**Files:**
- Modify: `frontend/src/app/history/history.component.ts`
- Modify: `frontend/src/app/history/history.component.html`

- [ ] **Step 1: Instalar `chart.js`**

```bash
cd /home/theusant/projects/industrial-inspection-ai/frontend
npm install chart.js
```

- [ ] **Step 2: Substituir `history.component.ts`**

```typescript
import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  Chart, LineController, LineElement, PointElement,
  LinearScale, CategoryScale, Tooltip, Filler,
} from 'chart.js';
import { ApiService, Inspection } from '../core/services/api.service';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

const STATUS_LABEL: Record<string, string> = { open: 'Em andamento', completed: 'Concluída' };
const STATUS_DOT: Record<string, string> = { open: '#ff9800', completed: '#4caf50' };
const SEVERITY_COLOR: Record<string, string> = {
  low: '#4caf50', medium: '#ff9800', high: '#f44336', critical: '#b71c1c', none: '#90a4ae',
};

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit, OnDestroy {
  @ViewChild('trendCanvas') trendCanvasRef?: ElementRef<HTMLCanvasElement>;
  inspections: Inspection[] = [];
  loading = true;
  statusLabel = STATUS_LABEL;
  statusDot = STATUS_DOT;
  showChart = false;
  private chart?: Chart;
  private equipmentId = '';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.equipmentId = this.route.snapshot.params['id'];
    this.api.getEquipmentHistory(this.equipmentId).subscribe({
      next: (data: Inspection[]) => {
        this.inspections = data;
        this.loading = false;
        const withData = data.filter(i => i.defectCount !== undefined);
        if (withData.length >= 2) {
          this.showChart = true;
          setTimeout(() => this.renderChart(withData), 0);
        }
      },
      error: () => {
        this.loading = false;
        this.snack.open('Erro ao carregar histórico.', 'Fechar', { duration: 3000, panelClass: 'snack-error' });
      },
    });
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  private renderChart(data: Inspection[]): void {
    if (!this.trendCanvasRef?.nativeElement) return;
    const sorted = [...data].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    this.chart = new Chart(this.trendCanvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: sorted.map(i => new Date(i.createdAt).toLocaleDateString('pt-BR')),
        datasets: [{
          label: 'Defeitos detectados',
          data: sorted.map(i => i.defectCount ?? 0),
          borderColor: '#2196f3',
          backgroundColor: 'rgba(33,150,243,.08)',
          pointBackgroundColor: sorted.map(i => SEVERITY_COLOR[i.maxSeverity ?? 'none']),
          pointRadius: 6,
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        plugins: { tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} defeito(s)` } } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Defeitos' } },
          x: { title: { display: true, text: 'Data' } },
        },
      },
    });
  }

  viewReport(id: string): void { this.router.navigate(['/inspections', id, 'report']); }
  back(): void { this.router.navigate(['/equipments']); }
}
```

- [ ] **Step 3: Adicionar canvas ao `history.component.html`**

Adicionar após o bloco `<!-- List -->` (antes do `</div>` final):

```html
  <!-- Trend chart -->
  <div *ngIf="showChart" style="background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);padding:16px;margin-top:16px">
    <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#0d1b2a">Evolução de Defeitos</h3>
    <p style="margin:0 0 12px;font-size:11px;color:#90a4ae">Cor do ponto: verde=baixo, laranja=médio, vermelho=alto, bordô=crítico</p>
    <canvas #trendCanvas style="max-height:200px"></canvas>
  </div>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/history/history.component.ts \
        frontend/src/app/history/history.component.html \
        frontend/package.json frontend/package-lock.json
git commit -m "feat: defect trend chart in inspection history"
```

---

## Task 8: Backend Deploy

**Pré-requisito:** Tasks 3 e 6 commitadas.

- [ ] **Step 1: Deploy CDK com a Gemini API key**

```bash
cd /home/theusant/projects/industrial-inspection-ai/infra
GEMINI_API_KEY=<sua-chave-aqui> cdk deploy --profile personal
```

Esperar: `✅ InspectionStack` no output. (~3-5 minutos)

- [ ] **Step 2: Testar PDF com fotos**

1. Abrir o app no browser
2. Criar nova inspeção, enviar 2-3 fotos, completar checklist
3. Gerar relatório → abrir PDF
4. Verificar seção "REGISTRO FOTOGRAFICO" com fotos e análises

- [ ] **Step 3: Testar trend (requer 2+ relatórios gerados)**

Após gerar 2 relatórios para o mesmo equipamento, abrir histórico → verificar gráfico aparece.

---

## Task 9: PWA

**Files:**
- Gerados por `ng add`: `angular.json`, `src/manifest.webmanifest`, `ngsw-config.json`, `src/app/app.config.ts`

- [ ] **Step 1: Rodar `ng add @angular/pwa` no diretório frontend**

```bash
cd /home/theusant/projects/industrial-inspection-ai/frontend
npx ng add @angular/pwa
```

Quando perguntar: aceitar as modificações padrão.

- [ ] **Step 2: Atualizar `ngsw-config.json` para estratégia de cache**

Após o `ng add`, o arquivo gerado em `frontend/ngsw-config.json` terá um bloco `dataGroups`. Adicionar ou garantir que existe o seguinte bloco `dataGroups` para cache da API:

```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/assets/**", "/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "equipments-api",
      "urls": ["/api/equipments"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 20,
        "maxAge": "5m",
        "timeout": "10s"
      }
    }
  ]
}
```

- [ ] **Step 3: Atualizar `src/manifest.webmanifest` com nome do app**

Verificar que o arquivo gerado tem `"name": "InspecAI"` e `"short_name": "InspecAI"`. Se não:

```json
{
  "name": "InspecAI",
  "short_name": "InspecAI",
  "theme_color": "#0d1b2a",
  "background_color": "#f5f7fa",
  "display": "standalone",
  "scope": "./",
  "start_url": "./",
  "icons": [
    {
      "src": "assets/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

Os ícones são gerados automaticamente pelo `ng add` com um ícone padrão Angular. Para personalizar: substituir os arquivos PNG em `src/assets/icons/` com ícones do InspecAI.

- [ ] **Step 4: Build de produção para testar PWA (SW não funciona em dev)**

```bash
cd /home/theusant/projects/industrial-inspection-ai/frontend
npm run build
npx http-server dist/frontend/browser -p 8080
```

Abrir `http://localhost:8080` no Chrome. Em DevTools → Application → Service Workers → verificar SW registrado. Em Application → Manifest → verificar dados do app.

- [ ] **Step 5: Commit e push**

```bash
cd /home/theusant/projects/industrial-inspection-ai
git add frontend/
git commit -m "feat: PWA support with service worker and installable manifest"
git push origin main
```

Amplify auto-deploya. Após deploy, acessar o site no mobile Chrome → botão "Adicionar à tela inicial" aparece.
