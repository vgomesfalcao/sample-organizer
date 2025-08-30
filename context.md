# Plano de Entrega — Sample Organizer (Node.js + TypeScript)

Guia passo a passo para construir o organizador de multitracks conforme os requisitos acordados: CLI/TUI com edição em lote, conversão para MP3, manutenção do backup WAV, estrutura de saída padronizada e UX com AppleScript (macOS) para seleção de pastas.

## 0) Requisitos e critérios de aceite

Requisitos funcionais
- Converter WAV (e M4A) para MP3; copiar MP3 sem reencode por padrão (reencode opcional).
- Manter coleção original (WAV) intacta; criar coleção paralela em MP3.
- Varredura flexível: arquivos em `multitracks/` ou soltos na pasta da música.
- Nomear saída: `Nome-Autor-Tom-XXbpm/multitracks/...`.
- Perguntar metadados faltantes mostrando o nome encontrado; edição em lote na TUI.
- Ignorar itens irrelevantes (apenas extensões suportadas).
- Perguntar destino para coleção MP3 (AppleScript no macOS; fallback CLI multiplataforma).

Critérios de aceite
- Dado um diretório de origem com músicas misturadas (WAV/M4A/MP3, com/sem subpasta `multitracks/`), ao executar o app:
  - Cria-se a estrutura em MP3 no destino, com uma pasta por música no padrão `Nome-Autor-Tom-XXbpm/multitracks/*`.
  - Para músicas sem todos os metadados, a TUI permite preencher Autor/Tom/BPM individualmente e em lote; o progresso pode ser salvo e retomado (metadata.json).
  - Arquivos não suportados são ignorados; MP3 existentes são copiados, salvo se `--reencode-mp3`.
  - Há relatório final com totais convertidos/copiedos/ignorados e tempo total.

## 1) Stack e dependências

- Node.js 18+ e TypeScript.
- Conversão: `fluent-ffmpeg` (requer `ffmpeg` e `ffprobe` no PATH).
- CLI: `commander` (flags e comandos).
- TUI: `ink` (preferida) ou `blessed` (alternativa). Para `ink`, usar `react` e `ink`.
- Prompts básicos (fallback): `inquirer`.
- Arquivos: `fs-extra`.
- Descoberta: `fast-glob` (ou varredura manual com filtros).
- Metadados de áudio: `music-metadata` (quando útil para inferências).
- Concorrência: `p-limit`.
- Logs/UX: `chalk`, `ora`, `cli-progress`.
- Testes: `vitest` e `ts-node`/`tsx` para dev.
- Qualidade: `eslint`, `prettier`.

Dev deps sugeridas: `typescript`, `tsx`, `@types/node`, `vitest`, `eslint`, `prettier`.

## 2) Estrutura do projeto

```
 Perguntar destino para coleção MP3 com seleção de pastas multiplataforma no terminal (e fallback para digitar caminho).
│  ├─ core/
│  │  ├─ scanner.ts            # Varredura e detecção de músicas/arquivos
│  │  ├─ metadata.ts           # Modelo, validação e cache (metadata.json)
├─ fixtures/                    # Dados de exemplo p/ e2e local (pequenos)
├─ tests/                       # Unit e integração (mock de ffmpeg)
├─ package.json
├─ tsconfig.json
├─ .eslintrc.cjs, .prettierrc
└─ README.md, task.md
```

## 3) Inicialização do repositório

1. Criar `package.json` com scripts:
```json
{
  "type": "module",
  "bin": { "sample-organizer": "dist/cli/index.js" },
  "scripts": {
    "dev": "tsx src/cli/index.ts",
    "tui": "tsx src/cli/index.ts --tui",
    "build": "tsc -p tsconfig.json",
│  │  └─ select-folders.ts     # Seleção de pastas multiplataforma (Inquirer)
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier -w ."
  }
}
```
2. Criar `tsconfig.json` com saída para `dist` e suporte a JSX para `ink`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsxImportSource": "react"
  },
  "include": ["src"]
  1) obter `source` e `dest` (seleção interativa no terminal ou input manual);
3. Instalar dependências:
```bash
npm install commander inquirer chalk ora cli-progress fast-glob fs-extra music-metadata fluent-ffmpeg p-limit react ink
npm install -D typescript tsx @types/node vitest eslint prettier
```
4. Configurar ESLint/Prettier (opcional, recomendado).

## 4) Modelagem e contratos

Tipos principais
- Song: id, sourcePath, inferredName, desiredName, meta {title, author, key, bpm}, files: Track[]
- Track: sourcePath, relPath, ext, kind (audio/other), action (convert/copy/ignore)
- Plan: por Song, caminhos de destino e operações de conversão/cópia
- Settings: source, dest, bitrate, reencodeMp3, dryRun, concurrency

Regras
- Extensões suportadas: .wav, .m4a, .mp3 (configurável).
- Nome da pasta destino: `Nome-Autor-Tom-XXbpm` (campos obrigatórios: title, author, key, bpm).
- Se metadados faltarem: preencher via TUI; salvar em `metadata.json` por música.

## 5) Scanner (src/core/scanner.ts)

Objetivo
- Descobrir músicas e suas faixas a partir da origem.

Algoritmo
- Listar subpastas de `source`.
- Para cada pasta:
  - Se existir `multitracks/`, coletar dentro dela os arquivos de áudio suportados.
  - Senão, coletar os arquivos de áudio suportados soltos na pasta.
  - Se não houver áudio suportado, ignorar a pasta.
- Normalizar caminhos relativos e classificar extensões.

Edge cases
- Pastas com áudio espalhado e subpastas extras: apenas arquivos na raiz e/ou `multitracks/` (outras pastas ignoradas).
- Duplicatas de nomes: resolver depois no `naming.ts` adicionando sufixo se necessário.

## 6) Nomenclatura (src/core/naming.ts)

- Inferir `title` a partir do nome da pasta (regex simples, limpa sufixos comuns).
- `author`, `key`, `bpm` podem ser inferidos se presentes no nome (e.g. `- 128bpm`).
- `desiredName = `${title}-${author}-${key}-${bpm}bpm`` (validar: bpm numérico; key como texto livre).
- Sanitize: remover separadores conflitantes, manter acentos/espaços; substituir barras e caracteres inválidos por `-`.
- Resolver colisões: se pasta destino já existir, adicionar sufixo `-v2`, `-take2` (estratégia configurável).

## 7) Cache/Metadados (src/core/metadata.ts)

- Estrutura de `metadata.json` por música (no source), com {title, author, key, bpm}.
- Funções: loadMetadata(sourcePath) → meta | null; saveMetadata(sourcePath, meta).
- Cache global opcional: `.sample-organizer/metadata-cache.json` no root do projeto.

## 8) TUI (src/tui/App.tsx)

Objetivo
- Editar metadados faltantes de várias músicas com eficiência.

Funcionalidades
- Lista de músicas, colunas: Title, Author, Key, BPM, Status.
- Filtros: “faltando autor”, “faltando key”, etc.
- Seleção múltipla; ações “aplicar a selecionados” (preencher autor/key/bpm).
- Edição inline de célula com inputs de `ink`.
- Atalhos: setas para navegar, Enter para editar, a/A para aplicar autor, k/K para key, b/B para bpm, s para salvar.
- Botões virtuais: [Salvar e continuar] [Exportar CSV] [Importar CSV] [Iniciar conversão].
- Persistir alterações em `metadata.json` ao salvar.

## 9) CSV de revisão (opcional, na TUI)

- Exportar `metadata.csv` com colunas: sourcePath, title, author, key, bpm.
- Abrir automaticamente (opcional) no macOS com `open`.
- Importar de volta e validar.

## 10) AppleScript (src/core/osx-dialogs.ts)

- Funções: chooseFolder(prompt): string | null
- Implementação: executar `osascript` com script `choose folder`, converter para POSIX path.
- Fallback: se falhar ou não macOS, pedir caminho via CLI/TUI input.

## 11) Conversão (src/core/ffmpeg.ts)

- Para `.wav` e `.m4a`: `ffmpeg` → MP3 (bitrate padrão 320k CBR; configurável).
- Para `.mp3`: copiar arquivo (stream) sem reencode, a menos que `reencodeMp3`.
- Criar diretório destino `Nome-.../multitracks/` e escrever lá.
- Validar saída (checar existência e duração com `ffprobe` opcionalmente).

## 12) Planejamento e execução (src/core/planner.ts, src/services/orchestrator.ts)

- planner: decide ação por arquivo (convert/copy/ignore) e monta plano com destinos.
- orchestrator:
  1) obter `source` e `dest` (AppleScript ou input);
  2) escanear músicas;
  3) carregar/inferir metadados;
  4) se faltantes → abrir TUI;
  5) gerar plano e exibir sumário (`--dry-run` imprime e sai);
  6) executar com `p-limit` de acordo com `--concurrency`;
  7) mostrar progresso (cli-progress) e relatório final.

## 13) CLI (src/cli/index.ts)

Flags
- `--source <path>`
- `--dest <path>`
- `--bitrate <e.g. 320k|192k|V0>`
- `--reencode-mp3`
- `--dry-run`
- `--non-interactive`
- `--tui` (forçar abrir TUI)
- `--concurrency <n>`

Comandos
- `scan` (lista músicas e status de metadados)
- `tui` (abre a TUI diretamente)
- `run` (fluxo completo: scan → meta → plano → execução)

## 14) Desempenho e concorrência

- Usar `p-limit` para limitar conversões simultâneas (default: min(4, nº de CPUs)).
- Pipeline: leitura → conversão → escrita, com backpressure via limite.
- Evitar reprocessamento: pular arquivos se já existem de forma válida no destino e `--overwrite` não setado.

## 15) Logs e erros

- Logs coloridos com `chalk` e spinners com `ora`.
- Tratamento:
  - `ffmpeg` ausente → erro claro com instrução para instalar.
  - Arquivo inválido/corrompido → registrar e continuar (não abortar tudo).
  - Permissão negada → registrar, sugerir verificar ACL.
- Relatório final: totais convertidos/copiedos/ignorados, falhas e tempo total.

## 16) Testes

Unitários
- `naming.ts`: sanitização, montagem do nome, sufixos de colisão.
- `scanner.ts`: detecção em pastas com/sem `multitracks/`.
- `metadata.ts`: load/save, merge com inferências.

Integração
- `planner + ffmpeg` com mocks (não roda ffmpeg real no CI).
- `orchestrator` dry-run: valida plano e saída no console.

E2E (local, opcional)
- Fixture mínima com 2 músicas, uma com `multitracks/`, outra com arquivos soltos.
- Executar para um `dest` temporário com ffmpeg real instalado.

## 17) Empacotamento e distribuição

- Binário npm: publicar `bin` no `package.json` (executável via `npx sample-organizer`).
- Alternativas (futuro): `pkg`/`nexe` para binários únicos.

## 18) Documentação

- Manter `README.md` alinhado (pré-requisitos, scripts, uso CLI/TUI, exemplos e limitações).
- Adicionar GIF curto da TUI (opcional).

## 19) Roadmap pós-MVP

- Normalização de loudness (EBU R128) opcional.
- Suporte a mais formatos (AIFF/FLAC/OGG).
- Regras avançadas de deduplicação e matching por similaridade.
- Painel web local (se TUI/CSV não forem suficientes).

## 20) Plano de execução sugerido (milestones)

- M1 — Bootstrap (config, scripts, tipos, scanner básico) [~0,5 dia]
- M2 — Naming + metadata cache + dry-run [~0,5 dia]
- M3 — TUI (lista, edição inline, aplicar a selecionados, salvar metadata.json) [~1 dia]
- M4 — Conversão ffmpeg + execução concorrente + progresso [~1 dia]
- M5 — CSV export/import + AppleScript picker + polimento [~0,5–1 dia]
- M6 — Testes, docs e empacotamento [~0,5 dia]

## 21) Comandos úteis (dev)

```bash
# Dev (CLI)
npm run dev -- --source "/origem" --dest "/destino" --dry-run

# Abrir TUI
npm run tui

# Build e execução
npm run build
npm start -- --source "/origem" --dest "/destino"

# Testes e lint
npm test
npm run lint
```
