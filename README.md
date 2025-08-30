# Organizador de Multitracks (Sample Organizer)

Ferramenta de linha de comando para organizar uma coleção de multitracks, mantendo o acervo original em WAV como backup e gerando uma coleção compacta em MP3 pronta para levar a eventos.

## Visão geral

- Converte arquivos WAV (e M4A) para MP3 mantendo a estrutura lógica de cada música.
- Mantém a coleção original (WAV) intacta e cria uma nova coleção apenas em MP3.
- Busca multitracks mesmo quando não há padrão dentro das pastas (em `/multitracks` ou soltos).
- Ignora arquivos e pastas irrelevantes.
- Pergunta ao usuário o destino da coleção MP3 e completa informações faltantes do nome da música.

## Estrutura de saída (coleção MP3)

Para cada música, a estrutura gerada será:

```
Nome da Musica-Autor-Tom-XXbpm/
  multitracks/
    ...arquivos.mp3
```

- O diretório `multitracks/` é mantido caso exista na origem; se os arquivos estiverem soltos, eles serão colocados dentro de `multitracks/` na saída.
- Somente arquivos de áudio relevantes serão mantidos/conversos para MP3 (por padrão: `.wav`, `.m4a`, `.mp3`).

## Padrão de nomenclatura

O nome da pasta da música na coleção MP3 seguirá o padrão:

```
Nome da Musica-Autor-Tom-XXbpm
```

- Se a origem não contiver todas as informações (Autor, Tom, BPM), o programa perguntará ao usuário as informações faltantes, mostrando qual era o nome identificado na pasta/arquivo de origem (ex.: “Encontrado: `Meu Louvor` – informe Autor/Tom/BPM”).
- BPM deve ser numérico (ex.: `120bpm`). O Tom pode ser informado livremente (ex.: `Bb`, `F#m`, `C`), e será usado como texto.

## Regras de descoberta de arquivos

- A ferramenta procura por áudio dentro da pasta da música:
  - Em subpasta `multitracks/`, se existir.
  - Soltos diretamente na pasta da música, caso não exista `multitracks/`.
- Extensões suportadas (configurável): `.wav`, `.m4a`, `.mp3`.
- Outros arquivos e pastas são ignorados (ex.: PDFs, imagens, sessões DAW, presets, etc.).

## Comportamento de conversão

- `.wav` → MP3 (padrão: 320 kbps CBR; configurável).
- `.m4a` → MP3 (transcodificação para padronizar a coleção).
- `.mp3` → copiado sem reencode (padrão), a menos que `--reencode-mp3` seja utilizado.

A coleção WAV original não é alterada nem removida.

## Fluxo de execução

1. Você informa ou confirma:
   - Pasta de origem (onde está sua coleção original em WAV/M4A/MP3).
   - Pasta de destino (onde ficará a coleção MP3 pronta para eventos).
2. A ferramenta varre as pastas da origem para identificar cada música.
3. Para cada música:
   - Descobre arquivos relevantes (dentro de `multitracks/` ou soltos).
   - Extrai/solicita metadados para montar o nome no padrão `Nome-Autor-Tom-XXbpm`.
   - Converte/copía para MP3 e cria a estrutura de saída.
4. Gera um relatório final com o que foi convertido, copiado e ignorado.

## Pré-requisitos

- macOS (testado) — deve funcionar também em Windows/Linux.
- FFmpeg instalado (utilizado para conversão de áudio).
- Python 3.10+ (recomendado) ou Node.js 18+ (alternativo) — a implementação de referência usa Python.

## Instalação (proposta em Python)

- FFmpeg via Homebrew (macOS):
  - `brew install ffmpeg`
- Ambiente Python e dependências:
  - `python3 -m venv .venv`
  - `source .venv/bin/activate`
  - `pip install typer rich tqdm pydantic pydub`

Observação: a ferramenta usará o executável `ffmpeg` do sistema.

## Uso rápido (CLI proposto)

- Executar assistente interativo (recomendado no primeiro uso):
  - `python -m sample_organizer`
- Executar com parâmetros explícitos:
  - `python -m sample_organizer --source "/caminho/da/colecao-wav" --dest "/caminho/para/mp3"`

Principais opções (sujeitas a ajustes na implementação):

- `--source PATH` — caminho da coleção original (WAV/M4A/MP3).
- `--dest PATH` — caminho da coleção MP3 (será criado se não existir).
- `--bitrate 320k` — taxa do MP3 (ex.: `320k`, `192k`, `V0`).
- `--reencode-mp3` — força reencode de MP3 existentes.
- `--dry-run` — simula a execução sem converter/copiar arquivos.
- `--non-interactive` — falha se faltar metadados ao invés de perguntar.

## Exemplos de saída

```
Minhas Musicas (origem)
├── Meu Louvor
│   ├── multitracks
│   │   ├── pad.wav
│   │   ├── click.wav
│   │   └── guide.m4a
│   └── capa.jpg
└── Outra Cancao - AutorX - C# - 128bpm
    ├── baixo.wav
    └── bateria.mp3
```

Gera:

```
Colecao MP3 (destino)
├── Meu Louvor-AutorY-G-120bpm
│   └── multitracks
│       ├── pad.mp3
│       ├── click.mp3
│       └── guide.mp3
└── Outra Cancao-AutorX-C#-128bpm
    └── multitracks
        ├── baixo.mp3
        └── bateria.mp3
```

No primeiro caso, as informações faltantes (Autor, Tom e BPM) foram perguntadas.

## Contrato (resumo técnico)

- Entrada:
  - `source`: pasta raiz com as músicas e multitracks (WAV/M4A/MP3).
  - Interação do usuário para preencher metadados ausentes.
- Saída:
  - `dest`: pasta com a coleção final em MP3, uma subpasta por música no padrão `Nome-Autor-Tom-XXbpm/multitracks/*`.
- Erros esperados:
  - FFmpeg ausente, arquivos corrompidos, permissões insuficientes, nomes inválidos de pasta (caracteres proibidos no SO).
- Sucesso:
  - Relatório final com quantidade convertida/copieda, tempo e eventuais avisos.

## Casos especiais e decisões

- Duplicatas: se existir a mesma música mais de uma vez, a ferramenta pode:
  - Pular quando encontrar colisão de nomes (padrão) e registrar aviso, ou
  - Adicionar sufixos `-v2`, `-take2` (opcional configurável).
- Arquivos já em MP3: copiados por padrão sem reencode para preservar qualidade e velocidade.
- M4A: transcodificados para MP3 para padronizar a coleção.
- Normalização de nível: não aplicada por padrão; pode ser adicionada futuramente (ex.: EBU R128).
- Caracteres especiais no nome: serão normalizados (espaços e acentos mantidos, porém removendo separadores conflitantes, se necessário).

## Segurança e preservação

- Nunca apaga ou move arquivos da coleção original.
- Evita sobrescrever no destino (usa verificação de existência + sumário); com `--overwrite`, permite substituir.
- `--dry-run` para revisar antes de executar.

## Desempenho

- Conversão em paralelo por música/arquivo (configurável, respeitando CPU/IO).
- Cache simples de decisões de metadados por música (para não perguntar novamente em reexecuções).

## Roadmap (sugestões)

- Arquivo `metadata.json` por música, com Autor/Tom/BPM cadastrados.
- Exportar/Importar CSV para metadados em lote.
- UI simples (TUI) para revisão de metadados em massa.
- Normalização de loudness e ganho automático.
- Suporte a mais formatos (AIFF/FLAC/OGG) configuráveis.

## Cobertura dos requisitos

- Converter WAV para MP3: Atendido (com bitrate configurável).
- Manter coleção WAV como backup e criar coleção MP3: Atendido.
- Suporte a músicas em M4A/MP3: Atendido (M4A → MP3; MP3 copiado).
- Buscar arquivos em `/multitracks` ou soltos: Atendido.
- Estrutura de cópia: `Nome-Autor-Tom-XXbpm/multitracks/...`: Atendido.
- Perguntar metadados faltantes mostrando o nome encontrado: Atendido.
- Ignorar arquivos/pastas irrelevantes: Atendido.
- Perguntar caminho de destino para a coleção MP3: Atendido.

## Licença

A definir pelo autor do projeto (sugestão: MIT).
