# Checklist incremental — Sample Organizer (Node.js + TypeScript)

Marque as caixas ao concluir as tarefas. Para detalhes e contexto, veja `context.md`.

Preparação do ambiente
- [x] Instalar Node.js 18+ e gerenciador de pacotes (npm/pnpm/yarn)
- [x] Instalar FFmpeg + FFprobe e validar no PATH
 

Bootstrap do projeto
- [x] Criar `package.json` com scripts básicos (dev, tui, build, start, test, lint, format)
- [x] Criar `tsconfig.json` com suporte a JSX (ink) e saída em `dist`
- [ ] Adicionar `.eslintrc` e `.prettierrc` (opcional, recomendado)
- [x] Adicionar `.gitignore` (node, dist, cache, metadata local)
- [x] Instalar dependências runtime (commander, inquirer, inquirer-file-tree-selection-prompt, chalk, ora, cli-progress, fast-glob, fs-extra, music-metadata, fluent-ffmpeg, p-limit, react, ink)
- [x] Instalar dependências de desenvolvimento (typescript, tsx, @types/node, vitest, eslint, prettier)

Estrutura e tipos
- [x] Criar pastas `src/cli`, `src/tui`, `src/core`, `src/services`, `src/utils`, `src/types`
- [x] Definir tipos base em `src/types/index.ts` (Song, Track, Plan, Settings)
- [x] Utilitários de FS e nome de arquivo em `src/utils/fs.ts` (sanitize, ensureDir, path helpers)
- [x] Utilitário de concorrência em `src/utils/concurrency.ts` (p-limit wrapper)
- [x] Logger simples em `src/utils/logger.ts`

Scanner e metadados
- [ ] Implementar `src/core/scanner.ts` (detectar músicas, `multitracks/` ou arquivos soltos)
- [ ] Implementar `src/core/metadata.ts` (load/save `metadata.json` por música)
- [ ] Implementar `src/core/naming.ts` (inferir e montar `Nome-Autor-Tom-XXbpm`, sanitize, colisões)

CLI e fluxo inicial
- [ ] Implementar `src/cli/index.ts` com commander (flags: source, dest, bitrate, reencode-mp3, dry-run, non-interactive, tui, concurrency)
- [ ] Implementar comando `scan` (listar músicas e status de metadados)
- [ ] Implementar comando `tui` (abrir TUI)
- [ ] Implementar comando `run` (pipeline básico até dry-run)

TUI com edição em lote (ink)
- [ ] Criar `src/tui/App.tsx` com tabela (Title, Author, Key, BPM, Status)
- [ ] Navegação e edição inline por célula
- [ ] Seleção múltipla e “aplicar a selecionados” (Autor/Tom/BPM)
- [ ] Filtros (faltando autor/key/bpm)
- [ ] Atalhos (setas, Enter, a/A, k/K, b/B, s)
- [ ] Persistência: salvar/retomar alterações em `metadata.json`
- [ ] Exportar/Importar CSV de metadados (opcional, recomendado)

Seleção de pastas multiplataforma
- [ ] Integrar `inquirer-file-tree-selection-prompt` para escolher `source`/`dest` no terminal
- [ ] Oferecer input manual de caminho como alternativa

Planejamento e conversão
- [ ] Implementar `src/core/planner.ts` (definir convert/copy/ignore e destinos)
- [ ] Implementar `src/core/ffmpeg.ts` (convert `.wav`/`.m4a`, copiar `.mp3`, bitrate padrão 320k, `--reencode-mp3`)
- [ ] Criar diretório destino `Nome-.../multitracks/` e escrever arquivos
- [ ] Validar saídas e lidar com erros (continuar em caso de falhas isoladas)

Orquestração e progresso
- [ ] Implementar `src/services/orchestrator.ts` (scan → meta → TUI se necessário → plano → execução)
- [ ] Adicionar barras de progresso com `cli-progress` e spinners com `ora`
- [ ] Concorrência com `p-limit` e opção `--concurrency`
- [ ] Respeitar `--dry-run` e `--non-interactive`

Testes e qualidade
- [ ] Unit: `naming.ts` (sanitize, montagem, colisões)
- [ ] Unit: `scanner.ts` (com/sem `multitracks/`)
- [ ] Unit: `metadata.ts` (load/save/merge)
- [ ] Integração: `planner + ffmpeg` (mocks)
- [ ] Integração: `orchestrator` dry-run
- [ ] E2E local com fixtures reais (opcional) e ffmpeg instalado
- [ ] Lint e format (CI opcional)

Documentação e entrega
- [ ] Atualizar `README.md` (uso CLI/TUI, requisitos, opções, exemplos)
- [ ] Adicionar GIF curto da TUI (opcional)
- [ ] Revisar `task.md` conforme ajustes
- [ ] Publicar pacote npm (opcional) ou distribuir via repositório

Aceite final
- [ ] Validar critérios de aceite em coleção de teste
- [ ] Revisar relatório final (convertidos/copiedos/ignorados, tempo)
- [ ] Registrar melhorias no roadmap
- [ ] Revisar relatório final (convertidos/copiedos/ignorados, tempo)
