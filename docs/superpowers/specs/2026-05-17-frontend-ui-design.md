# Frontend UI Design — Inspeção Industrial IA

**Goal:** Angular 17 SPA com visual industrial profissional — Navy sidebar + Material Design.

---

## Decisões de design

### Navegação
- `MatSidenav` fixo, 220px, fundo `#0d1b2a` (navy)
- Topo do sidenav: logo ⚙️ + "Inspeção / Industrial IA"
- Nav links: `mat-icon` + label em `#78909c`
- Active state: `border-left: 3px solid #2196f3` + `background: rgba(33,150,243,.12)` + texto `#64b5f6`
- Rodapé do sidenav: avatar com iniciais + nome do usuário + ícone logout
- Conteúdo: `background: #f5f7fa`, `padding: 24px`, `max-width: 900px` centrado

### Tema Angular Material
```scss
$primary: mat.define-palette(mat.$blue-palette, 500);   // #2196f3
$accent:  mat.define-palette(mat.$blue-grey-palette, 900); // #0d1b2a
$warn:    mat.define-palette(mat.$red-palette);
```
- Surface (cards): `background: white`, `border-radius: 8px`, `box-shadow: 0 2px 8px rgba(0,0,0,.08)`
- Background geral: `#f5f7fa`

### Paleta de status
| Status | Cor | Uso |
|--------|-----|-----|
| Ok / Inspecionado | `#4caf50` | Dot verde na lista |
| Em andamento | `#ff9800` | Dot laranja, badge, botão "Continuar" |
| Nunca inspecionado | `#e0e0e0` | Dot cinza |
| Erro / Crítico (defeito) | `#f44336` | Chip de defeito alto/crítico |
| Médio (defeito) | `#ff9800` | Chip de defeito médio |
| Baixo (defeito) | `#4caf50` | Chip de defeito baixo |

### Lista de equipamentos
- `mat-list` com hover (`#f8f9ff`)
- Cada item: dot de status (10px com glow ring) + nome/subtítulo + chip de tipo + botão ação
- Chip de tipo por categoria: Manutenção=azul, Solda=laranja, Estruturas=roxo, Equipamento=verde
- FAB "＋ Novo Equipamento" no canto inferior direito
- Empty state: ícone grande 🏭 + texto + botão CTA

### Wizard de inspeção
- `MatStepper` horizontal, `linear=true` (não clicável, só avança ao completar)
- Steps: **Criar → Checklist → Fotos → Relatório**
- Step concluído: círculo `#2196f3` + ✓. Atual: círculo + glow ring. Próximos: `#e0e0e0`

### Fotos + IA
- Drop zone com borda dashed `#90caf9`, hover `#2196f3`
- Cards de foto: miniatura (120px) + análise à direita
- Chips de defeito coloridos por severidade
- Estado "analisando": spinner inline `border: 2px solid #2196f3; border-top-color: transparent`
- Botão "Gerar Relatório" desabilitado enquanto há análise pendente

### Página de relatório
- Stats: checklist (X/Y itens), defeitos (N), fotos (N)
- Botão primário: "📥 Download PDF"
- Botão secundário: "🏠 Voltar ao Início"

### Loading states
- **Skeleton shimmer** para listas (não spinner):
  ```css
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  ```
- Spinner pequeno só dentro de botões (ação em andamento)

### Feedback
- `MatSnackBar` canto inferior esquerdo, duração 3s
- Sucesso: `panelClass: 'snack-success'` (fundo `#2e7d32`)
- Erro: `panelClass: 'snack-error'` (fundo `#c62828`)
