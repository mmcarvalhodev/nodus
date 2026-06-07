# NODUS - Funcionalidades Free e Pro

Documento de referência montado a partir do código do projeto em `nodus_final`.

Objetivo: listar o que o NODUS faz hoje, o que está disponível no plano `FREE`, o que é `PRO`, e quais pontos ainda estão inconsistentes no código.

## Escopo

Este documento reflete o comportamento implementado no código nesta base:

- captura de conteúdo em páginas de IA compatíveis
- dashboard com `Cards`, `Chains` e `Projetos`
- filas, tags, notas, anexos, exportação, backup e telemetria
- gates reais de licença observados no código

## Plataformas suportadas

O manifesto registra conteúdo para:

- ChatGPT (`chat.openai.com` e `chatgpt.com`)
- Claude
- Gemini
- Perplexity
- Copilot
- Grok
- DeepSeek

## Visão geral do produto

O NODUS é uma extensão para capturar, organizar e reutilizar respostas e ideias geradas em plataformas de IA.

Fluxos principais presentes no código:

- salvar respostas manualmente com modal
- salvar rapidamente na fila rápida
- abrir dashboard lateral
- copiar ou injetar conteúdo salvo de volta no input
- organizar itens por filas, tags, notas e projetos
- montar `Chains` com cards e capturas completas
- anexar arquivos a cards e chains
- exportar conteúdo
- usar backup criptografado
- consultar estatísticas locais de uso com telemetria opcional
- abrir popup com métricas rápidas de uso e storage
- configurar comportamento por plataforma no painel de configurações

## Funcionalidades disponíveis em todos os planos

Estas capacidades existem no produto e não aparecem com gate `PRO` no código principal:

- captura manual de ideias pelo botão `Salvar`
- captura rápida pelo botão `Rápido`
- abertura do dashboard pelo botão `Dash`
- visualização e gerenciamento de cards no dashboard
- edição inline de cards
- exclusão de cards
- copiar card para a área de transferência
- injetar conteúdo salvo de volta na IA
- alternar modo de injeção
- filtro por plataforma
- filtro por tags
- busca por texto
- notas por card
- tags por card
- reordenação de tags
- movimentação de cards entre filas
- link para a origem da captura
- contagem de injeções por card
- suporte a anexos em cards
- suporte a anexos em chains
- aba de `Chains`
- aba de `Projetos`
- organização por projetos
- arrastar cards e chains para projetos
- telemetria opcional ligada/desligada
- configuração por plataforma para mostrar/ocultar botões
- animações de cards
- injeção cross-platform opcional
- popup com resumo de capturas, filas, chains, tags e storage
- reabrir onboarding pelas configurações
- troca manual de idioma da interface
- links de suporte, website, repositório e contato

## Matriz Free vs Pro

### Filas

| Recurso | FREE | PRO |
| --- | --- | --- |
| Quick Queue | Sim | Sim |
| Default Queue | Sim | Sim |
| Q1 | Sim | Sim |
| Q2 | Não | Sim |
| Q3 | Não | Sim |
| Q4 | Não | Sim |
| Total de filas disponíveis | 3 | 6 |

Notas:

- `FREE` usa `Quick`, `Default` e `Q1`
- `PRO` desbloqueia `Q2`, `Q3` e `Q4`
- a `Quick Queue` tem limite FIFO de 50 itens

### Chains

| Recurso | FREE | PRO |
| --- | --- | --- |
| Criar chains | Sim | Sim |
| Quantidade de chains | Ilimitado no código atual | Ilimitado |
| Nós por chain | Ilimitado no código atual | Ilimitado |
| Export TXT | Sim | Sim |
| Export HTML | Não | Sim |
| Export DOC/Word | Não | Sim |
| Full Chat Capture | Ilimitado | Ilimitado |
| Anexos em chains | Sim | Sim |

Notas:

- Full Chat Capture é ilimitado em ambos os planos
- o submenu de export expõe `TXT`, `HTML` e `DOC`
- existe função de export `PDF` no código, mas ela não está exposta no submenu atual

### Projetos

| Recurso | FREE | PRO |
| --- | --- | --- |
| Aba Projetos | Sim | Sim |
| Criar projetos | Sim | Sim |
| Limite de projetos customizados | 3 | Ilimitado no gate atual |
| Projetos especiais `Geral` e `Sem Projeto` | Sim | Sim |
| Arrastar cards/chains para projeto | Sim | Sim |
| Editar projeto | Sim | Sim |
| Excluir projeto | Sim | Sim |

Nota:

- o limite de `3` projetos no `FREE` existe em `projects.js`, mas não está centralizado em `license.js`

### Backup

| Recurso | FREE | PRO |
| --- | --- | --- |
| Export backup criptografado | Não | Sim |
| Import backup criptografado | Não | Sim |
| Senha do backup | Não | Sim |
| Criptografia AES-256-GCM | Não | Sim |

Notas:

- o backup criptografado usa AES-256-GCM
- a derivação de chave usa PBKDF2 com `100000` iterações
- o formato baixado é `.nodus.encrypted`

### Telemetria e estatísticas

| Recurso | FREE | PRO |
| --- | --- | --- |
| Telemetria desligada | Sim | Sim |
| Telemetria ligada | Sim | Sim |
| Ver estatísticas locais | Sim, quando telemetria está ligada | Sim |
| Envio manual de batch | Sim, quando telemetria está ligada | Sim |
| Envio automático em batch | Sim | Sim |

Notas:

- no código atual, a UI ativa usa apenas dois modos: `0 = off` e `1 = on`
- o batch é enviado com `100 eventos` ou `24 horas`
- há referências antigas a `Modo 2 / Auditoria Expandida`, mas isso não está ativo na UI principal atual

### Exportação

| Recurso | FREE | PRO |
| --- | --- | --- |
| Export TXT | Sim | Sim |
| Export HTML | Não | Sim |
| Export DOC/Word | Não | Sim |

Notas:

- `license.js` lista `txt` no `FREE` e `txt/html/docx` no `PRO`
- na UI de chains, o botão aparece como `DOC (Word)`

## Funcionalidades detalhadas do produto

### Captura e salvamento

- captura manual com modal
- captura rápida sem modal
- captura de chat completo em fluxo próprio de chains
- prevenção de duplicata no salvamento por hash de conteúdo
- associação da captura à plataforma de origem
- registro de data e última modificação
- armazenamento local via `chrome.storage.local`
- roteamento por fila com regras de capture method
- limite de `4` tags por card

### Cards

- busca por texto
- filtro por tags
- filtro por plataforma
- filtro por período: hoje, semana, mês, todo o período
- layouts de 1, 2 e 3 colunas
- animações de entrada configuráveis
- edição inline
- notas inline
- tags inline
- reordenação de tags por drag and drop
- mudança de fila
- link para origem
- cópia para clipboard
- injeção no input da IA
- contador de injeções
- limpar fila atual
- contagem de itens filtrados por fila
- overlay de upsell para filas bloqueadas do PRO

### Injeção

- injeção do conjunto completo pergunta + resposta
- injeção apenas da resposta
- alternância do modo de injeção
- bloqueio cross-platform quando a opção está desligada
- opção para liberar cross-platform inject nas configurações
- envio da injeção para a aba atual via mensagem ao background

### Anexos

- armazenamento em IndexedDB
- abertura inline nos cards
- adicionar arquivos
- remover arquivos
- baixar arquivos
- seleção de múltiplos anexos
- drag bar flutuante para anexos
- integração com chains
- file tray dedicado nas chains
- injeção de anexos selecionados em modo texto nas chains

### Chains

- criação e leitura de chains
- inclusão de ideias em chains
- captura de chat completo em chain
- criação manual de nova chain
- adição manual de node
- anexos por chain
- notas por chain
- abrir chain específica a partir de logs do popup
- promover item da chain para outra fila
- exportação
- navegação e renderização dedicadas no dashboard

### Projetos

- sidebar de projetos
- projetos especiais `Geral` e `Sem Projeto`
- projetos customizados com nome e cor
- contadores por projeto
- cards e chains dentro do mesmo projeto
- drag and drop para reclassificar itens
- edição e exclusão de projeto pela sidebar

### Configurações

- seção de conta/licença
- habilitar/desabilitar botões automáticos
- habilitar/desabilitar por plataforma
- injeção cross-platform
- animação padrão dos cards
- telemetria on/off
- visualização de estatísticas de telemetria
- atualização manual de logs
- limpeza de logs
- backup criptografado
- seleção manual de idioma: `auto`, `pt`, `en`, `es`
- reabrir onboarding
- seção de apoio com Ko-fi e GitHub Sponsors
- seção About/OpenCore com links externos

### Popup de estatísticas

O popup atual não é só um atalho. Ele funciona como um mini painel de observabilidade local.

Capacidades presentes no código:

- abrir dashboard na aba atual
- abrir configurações na aba atual
- mostrar capturas de hoje
- mostrar total de ideias
- mostrar total por fila
- mostrar total de chains e total de nodes
- mostrar logs recentes
- mostrar tags já existentes
- mostrar uso do `chrome.storage.local`
- mostrar contagem por plataforma
- mostrar últimas chains criadas nos logs
- clicar num log de chain para abrir diretamente essa chain no dashboard
- mostrar estado da telemetria
- mostrar fila de eventos da telemetria
- mostrar último envio
- mostrar previsão do próximo envio
- enviar batch de telemetria manualmente

## Resumo executivo de planos

### FREE

O `FREE` hoje entrega o núcleo do produto:

- captura manual e rápida
- dashboard completo
- cards, tags, notas e anexos
- chains
- projetos com limite de 3
- 3 filas disponíveis
- export TXT
- full chat capture ilimitado
- telemetria opcional
- popup de estatísticas
- configurações completas de comportamento visual e por plataforma
- reabertura do onboarding
- troca de idioma

### PRO

O `PRO` hoje adiciona:

- 3 filas extras: `Q2`, `Q3`, `Q4`
- export HTML
- export DOC/Word
- full chat capture ilimitado
- backup criptografado com senha
- criação ilimitada de projetos no gate atual
- desbloqueio das filas Q2, Q3 e Q4 no dashboard e no roteamento de storage

## Inconsistências do código que vale revisar

Estes pontos apareceram no código e podem confundir documentação, onboarding ou pricing:

1. `Chains ilimitadas`

- o código atual define chains ilimitadas tanto no `FREE` quanto no `PRO`
- porém alguns textos antigos do produto tratam isso como benefício `PRO`

2. `Advanced stats`

- `license.js` ainda lista `advanced_stats` como `PRO`
- mas a UI principal de telemetria atual não faz gate de estatísticas para `PRO`

3. `Modo 2 / Auditoria Expandida` *(resolvido)*

- referências a `Modo 2` foram removidas da UI e do config
- a telemetria opera com `OFF (0)` e `ON (1)` — padrão `ON` (opt-out)

4. `Export PDF`

- existe função de export `PDF` em `dashboard_chains.js`
- mas o submenu atual não expõe esse formato ao usuário

5. `Projetos`

- o limite `FREE = 3 projetos` está implementado em `projects.js`
- mas isso não está centralizado no módulo de licença

6. `Popup x settings de telemetria` *(resolvido)*

- a UI principal e o popup agora sincronizam `telemetry_enabled` + `settings.telemetryMode` em conjunto
- o toggle do dashboard foi corrigido para escrever nas duas chaves imediatamente ao mudar

7. `Popup e plataformas`

- o popup lista plataformas em um conjunto próprio
- esse conjunto pode ficar desatualizado em relação ao manifesto se novas plataformas forem adicionadas e o popup não for atualizado junto

## Arquivos-base consultados

Principais arquivos que sustentam este documento:

- `manifest.json`
- `content/modules/license.js`
- `content/modules/all_modules.js`
- `content/modules/dashboard_cards.js`
- `content/modules/dashboard_chains.js`
- `content/modules/dashboard_modal.js`
- `content/modules/projects.js`
- `content/modules/projects_ui.js`
- `content/modules/attachments_db.js`
- `content/modules/attachments_ui.js`
- `telemetry/telemetry.config.js`

## Uso recomendado deste README

Este arquivo pode servir como base para:

- documentação interna
- pricing page
- onboarding
- landing page
- FAQ de planos
- checklist de QA antes do lançamento
