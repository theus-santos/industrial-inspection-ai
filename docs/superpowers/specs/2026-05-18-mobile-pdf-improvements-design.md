# InspecAI — Mobile, PDF com Fotos e Melhorias

**Data:** 2026-05-18  
**Abordagem:** Sequencial por impacto (A)  
**Sequência:** Mobile → PDF fotos → Dashboard → QR Code → Trend → PWA

---

## 1. Mobile Responsive

### Problema
Sidebar fixa de 220px quebra em telas < 768px. Botões de ação na lista de equipamentos transbordam.

### Solução

**`AppComponent`**
- Injeta `BreakpointObserver` do `@angular/cdk/layout`
- Sinal `isMobile = signal(false)` atualizado via `observer.observe(Breakpoints.Handset)`
- Drawer: `[mode]="isMobile() ? 'over' : 'side'"` e `[opened]="!isMobile() && auth.isAuthenticated()"`
- Fecha drawer automaticamente após navegação no mobile

**Bottom Nav (mobile only)**
- `<div class="bottom-nav" *ngIf="isMobile() && auth.isAuthenticated()">` dentro do `mat-drawer-content`
- 3 tabs: Dashboard (`dashboard`) | Equipamentos (`precision_manufacturing`) | + Novo (`add_circle`)
- CSS fixado no bottom via `position: fixed; bottom: 0`
- Padding-bottom no conteúdo para não ser coberto

**Sidebar desktop**
- Adiciona item "Dashboard" como primeiro link (acima de Equipamentos)
- Permanece idêntico ao atual

**`equipment-list`**
- Botões (Inspecionar / Histórico / Excluir / QR) em linha no desktop
- No mobile: apenas botão "Inspecionar" visível + ícone kebab `more_vert` que abre menu com as demais ações via `MatMenu`

**Ajustes globais mobile**
- Content padding: `24px → 12px` via media query em `app.component.scss`
- `max-width: 900px` removido no mobile (já é condicional por auth, agora também por breakpoint)
- Stepper no photos component: labels encurtados se necessário (Material já adapta)

---

## 2. PDF com Fotos

### Problema
Relatório gerado não inclui as fotos enviadas, apenas tabela de defeitos.

### Solução

**`report.handler.ts`**
- Para cada `Photo` em `photos[]`, gera presigned GET URL via `GetObjectCommand` (expiresIn: 120s)
- Passa `photosWithUrls: Array<{ photo: Photo; url: string; analysis: DefectAnalysis | undefined }>` ao `PdfService`

**`pdf.service.ts`**
- `ReportInput` ganha campo `photosWithUrls`
- Novo método privado `fetchImagesAsBase64(photosWithUrls)`: baixa todas em paralelo via `Promise.all`, retorna array de `{ photoId, data, mimeType }`
- Nova seção no doc: `REGISTRO FOTOGRÁFICO` após resumo de defeitos
- Por foto (layout tipo B — uma por linha):
  ```
  [imagem 240px largura] | Foto N
                          | [badges de defeitos coloridos]
                          | "summary em itálico"
  ```
  Implementado como `table` pdfmake de 2 colunas: `[{ image, width: 240 }, { stack: [...] }]`
- Foto sem análise: coluna direita mostra "Análise indisponível"
- Matching foto ↔ análise via `analyses.find(a => a.photoId === photo.id)`

**Interface**
```typescript
interface PhotoWithUrl {
  photo: Photo;
  url: string;
  analysis: DefectAnalysis | undefined;
}
```

---

## 3. Dashboard com KPIs

### Rota
- Nova rota `/dashboard` — página inicial padrão
- Redirect: `/` → `/dashboard`
- `authGuard` aplicado

### `DashboardComponent`

**Dados** (sem nova API, usa endpoints existentes):
- `GET /equipments` → lista + count
- `GET /equipments/:id/inspections` para cada equipamento em paralelo via `forkJoin`

**KPIs exibidos:**
| Card | Valor |
|------|-------|
| Equipamentos cadastrados | `equipments.length` |
| Inspeções realizadas | soma de inspeções de todos equipamentos |
| Defeitos críticos | contagem de inspeções com `maxSeverity === 'critical'` (quando campo existir) |
| Última inspeção | data mais recente entre todos equipamentos |

**CTA destaque:** botão "Nova Inspeção" → `/equipments`

**Skeleton loading** com mesma animação da lista de equipamentos.

---

## 4. QR Code por Equipamento

### Lib
`qrcode` (npm, client-side canvas, sem dep Angular-específica).

### Fluxo
1. Botão QR `qr_code` em cada linha de equipamento (desktop: ícone; mobile: no menu kebab)
2. Abre `MatDialog` → `QrDialogComponent`
3. QR gerado via `QRCode.toCanvas(canvasEl, url)` onde `url = ${origin}/inspections/new?inspect=${equipmentId}`
4. Botão "Baixar PNG" → `canvas.toDataURL()` + link download

### `inspection-create.component.ts`
- No `ngOnInit`: lê `this.route.snapshot.queryParams['inspect']`
- Se presente: pré-seleciona equipamento no formulário + avança automaticamente pro passo 2 (checklist)

---

## 5. Histórico de Saúde do Equipamento (Trend)

### Problema
Análises ficam em registros separados — buscar todas por inspeção seriam N chamadas custosas.

### Solução: gravar resumo na inspeção ao gerar relatório

**`shared/types.ts`**
```typescript
interface Inspection {
  // campos existentes...
  defectCount?: number;
  maxSeverity?: string;
}
```

**`inspection.repo.ts`**
- Novo método `updateSummary(id: string, data: { defectCount: number; maxSeverity: string })`

**`report.handler.ts`**
- Após gerar PDF, chama `inspectionRepo.updateSummary(inspectionId, { defectCount: allDefects.length, maxSeverity })`

**`history.component`**
- Se alguma inspeção da lista tiver `defectCount` definido, renderiza gráfico abaixo da lista
- Lib: `Chart.js` + `ng2-charts`
- Tipo: gráfico de linha
  - Eixo X: datas das inspeções (ordenadas)
  - Eixo Y: `defectCount`
  - Cor do ponto mapeada para `maxSeverity` (verde/amarelo/laranja/vermelho)
- Inspeções sem relatório gerado: valor 0, ponto cinza

---

## 6. PWA

### Instalação
```bash
ng add @angular/pwa
```
Gera automaticamente:
- `manifest.webmanifest`: `name: "InspecAI"`, `short_name: "InspecAI"`, `display: "standalone"`, ícones 192/512px
- `ngsw-config.json`: service worker com cache do app shell
- Registro do SW em `app.config.ts`

### Cache strategy (`ngsw-config.json`)
- App shell (JS/CSS/HTML): `performance` (cache first) — carrega instantâneo
- Assets estáticos: `performance`
- API `/equipments`: `freshness` (network first, TTL 5 min) — dados atualizados quando há rede

### O que funciona offline
- App shell e navegação entre rotas cacheadas
- Lista de equipamentos (TTL de cache)

### O que **não** funciona offline
- Upload de fotos (S3 presigned URL requer rede)
- Análise IA (Gemini requer rede)
- Geração de PDF (Lambda requer rede)

### Ícones
Gerar ícones base (192×512px) com logo InspecAI. Ferramentas: `sharp` via script npm ou manualmente.

---

## Ordem de Implementação

1. **Mobile Responsive** — `app.component.ts/html/scss`, `equipment-list.component.html`
2. **PDF com Fotos** — `report.handler.ts`, `pdf.service.ts`
3. **Dashboard** — novo `dashboard.component`, `app.routes.ts`
4. **QR Code** — novo `qr-dialog.component`, `equipment-list.component`, `inspection-create.component`
5. **Trend** — `types.ts`, `inspection.repo.ts`, `report.handler.ts`, `history.component`
6. **PWA** — `ng add @angular/pwa` + configuração

## Arquivos Chave por Feature

| Feature | Arquivos Alterados |
|---------|-------------------|
| Mobile | `app.component.ts/html/scss`, `equipment-list.component.html/ts` |
| PDF fotos | `report.handler.ts`, `pdf.service.ts` |
| Dashboard | `app.routes.ts`, novo `dashboard/dashboard.component.ts/html` |
| QR Code | `equipment-list.component.ts/html`, novo `qr-dialog/qr-dialog.component.ts/html`, `inspection-create.component.ts` |
| Trend | `shared/types.ts`, `inspection.repo.ts`, `report.handler.ts`, `history.component.ts/html` |
| PWA | `angular.json`, `manifest.webmanifest`, `ngsw-config.json`, `app.config.ts` |
