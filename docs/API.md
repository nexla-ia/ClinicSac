# MedicinaMKT — API de Integração

> Documentação para integração de agentes de IA (n8n, Make, scripts próprios) com a plataforma MedicinaMKT.
>
> A API é exposta via **Supabase PostgREST**. Todos os endpoints aceitam JSON e retornam JSON.
>
> **Não inclui endpoints administrativos** (super ADM, empresas, billing, usuários da plataforma) — esses são privados.

---

## Sumário

1. [Setup](#1-setup)
2. [Convenções](#2-convenções)
3. [Pacientes](#3-pacientes-saved_contacts)
4. [Mensagens](#4-mensagens-mensagens_geral)
5. [Conversas / Tickets](#5-conversas--tickets-conversations--attendances)
6. [Catálogo Clínico](#6-catálogo-clínico)
7. [Agenda](#7-agenda-agendas--appointments)
8. [Alertas](#8-alertas-alerts)
9. [Atividades / Kanban](#9-atividades--kanban)
10. [Receitas comuns para IA](#10-receitas-comuns-para-ia)

---

## 1. Setup

**Base URL:**
```
https://pllvpbzskmargpdpvumg.supabase.co/rest/v1
```

**Headers obrigatórios em toda requisição:**
```http
apikey: {{anon_key}}
Authorization: Bearer {{anon_key}}
Content-Type: application/json
```

> A `anon_key` (também chamada de `apikey`) é entregue por empresa. Cada empresa tem **uma instância** identificada pelo campo `instancia` — todas as queries DEVEM filtrar por ela.

**Variáveis úteis:**

| Variável     | Descrição                           | Exemplo            |
|--------------|-------------------------------------|--------------------|
| `base_url`   | URL do projeto Supabase             | `https://pllvpbzskmargpdpvumg.supabase.co` |
| `anon_key`   | Chave anon pública                  | `eyJhbGci...`      |
| `instancia`  | ID da empresa (multi-tenant)        | `clinicaolhos`     |

---

## 2. Convenções

### Filtros (PostgREST query string)

```
?coluna=eq.valor          # igual
?coluna=neq.valor         # diferente
?coluna=in.(a,b,c)        # entre valores
?coluna=gte.2026-01-01    # maior ou igual
?coluna=lte.2026-12-31    # menor ou igual
?coluna=ilike.*joao*      # busca case-insensitive
?coluna=is.null           # é nulo
?coluna=not.is.null       # não nulo
```

### Ordenação e paginação

```
?order=created_at.desc&limit=20&offset=0
```

### Selecionar colunas específicas

```
?select=id,nome,numero,birthdate
```

### Joins (foreign keys)

```
?select=*,agendas(name,color),professionals(name)
```

### Header útil em respostas POST/PATCH

```http
Prefer: return=representation    # retorna o registro inserido/atualizado
Prefer: resolution=merge-duplicates  # upsert
```

### Multi-tenant — REGRA DE OURO

> **Toda query deve filtrar `?instancia=eq.{{instancia}}`**. Sem isso, a query retornaria dados de outras clínicas (RLS bloqueia, mas é boa prática enviar o filtro).

---

## 3. Pacientes (`saved_contacts`)

Tabela única dos pacientes cadastrados na clínica.

### Campos principais

| Coluna                 | Tipo      | Descrição                                           |
|------------------------|-----------|-----------------------------------------------------|
| `id`                   | uuid      | PK                                                  |
| `instancia`            | text      | ID da empresa                                       |
| `nome`                 | text      | Nome completo                                       |
| `numero`               | text      | Telefone com sufixo (`5511999999999@s.whatsapp.net`)|
| `photo`                | text      | Base64 da foto (opcional)                           |
| `cpf`, `rg`            | text      | Documentos                                          |
| `birthdate`            | date      | Data de nascimento (YYYY-MM-DD)                     |
| `gender`               | text      | `masculino`/`feminino`/`outro`                      |
| `email`                | text      | E-mail                                              |
| `phone_secondary`      | text      | Telefone secundário                                 |
| `address`              | text      | Endereço completo                                   |
| `insurance_plan_id`    | uuid      | FK → `insurance_plans.id`                           |
| `card_number`          | text      | Número da carteirinha                               |
| `allergies`            | text      | Alergias                                            |
| `chronic_conditions`   | text      | Condições crônicas                                  |
| `medications`          | text      | Medicações em uso                                   |
| `clinical_notes`       | text      | Notas clínicas                                      |
| `origem`               | text      | Canal de origem (Instagram, Indicação, Google...)   |
| `primeiro_contato`     | text      | `sim`/`nao`                                         |
| `created_at`           | timestamp | Cadastro                                            |

### 3.1 Listar pacientes

```http
GET /saved_contacts?instancia=eq.{{instancia}}&order=nome.asc&limit=100
```

**Response:**
```json
[
  {
    "id": "uuid-1",
    "nome": "Maria Silva",
    "numero": "5511987654321@s.whatsapp.net",
    "birthdate": "1985-03-15",
    "insurance_plan_id": "uuid-x",
    "origem": "Instagram"
  }
]
```

### 3.2 Buscar paciente por número

```http
GET /saved_contacts?instancia=eq.{{instancia}}&numero=eq.5511987654321@s.whatsapp.net&select=*
```

> Retorna **array** (vazio ou com 1 item). Usar `&limit=1` se quiser garantir.

### 3.3 Buscar por nome (parcial, case-insensitive)

```http
GET /saved_contacts?instancia=eq.{{instancia}}&nome=ilike.*maria*&limit=10
```

### 3.4 Criar paciente

```http
POST /saved_contacts
Prefer: return=representation
```

**Body:**
```json
{
  "instancia": "clinicaolhos",
  "nome": "Maria Silva",
  "numero": "5511987654321@s.whatsapp.net",
  "birthdate": "1985-03-15",
  "gender": "feminino",
  "email": "maria@email.com",
  "insurance_plan_id": "uuid-do-convenio",
  "card_number": "9876-5432-1098",
  "allergies": "Penicilina",
  "origem": "Instagram"
}
```

### 3.5 Atualizar paciente

```http
PATCH /saved_contacts?id=eq.{paciente_id}
Prefer: return=representation
```

**Body** (qualquer subconjunto de campos):
```json
{
  "allergies": "Penicilina, dipirona",
  "chronic_conditions": "Hipertensão"
}
```

### 3.6 Deletar paciente

```http
DELETE /saved_contacts?id=eq.{paciente_id}
```

---

## 4. Mensagens (`mensagens_geral`)

Histórico completo de todas mensagens trocadas (cliente, IA, atendente, ferramentas).

### Campos

| Coluna             | Tipo      | Descrição                                              |
|--------------------|-----------|--------------------------------------------------------|
| `id`               | bigint    | PK                                                     |
| `instancia`        | text      | ID da empresa                                          |
| `numero`           | text      | Telefone do paciente (`5511999999999@s.whatsapp.net`)  |
| `mensagem`         | text      | Conteúdo (texto OU base64 de áudio/imagem/PDF)        |
| `type`             | text      | `cliente` / `ia` / `humano` / `tool`                   |
| `horaLastMessage`  | text      | Timestamp formato `DD/MM/YYYY HH:MM:SS`                |
| `created_at`       | timestamp | Default now()                                          |

### 4.1 Últimas mensagens de um paciente

```http
GET /mensagens_geral?instancia=eq.{{instancia}}&numero=eq.{numero}&order=id.desc&limit=20
```

### 4.2 Primeiras mensagens (para inferência de origem)

```http
GET /mensagens_geral?instancia=eq.{{instancia}}&numero=eq.{numero}&type=eq.cliente&order=created_at.asc&limit=5
```

### 4.3 Volume de mensagens por dia (período)

```http
GET /mensagens_geral?instancia=eq.{{instancia}}&created_at=gte.2026-04-01&created_at=lte.2026-04-30&select=id,type,created_at&limit=10000
```

### 4.4 Inserir mensagem (registrar resposta da IA)

```http
POST /mensagens_geral
```

**Body:**
```json
{
  "instancia": "clinicaolhos",
  "numero": "5511987654321@s.whatsapp.net",
  "mensagem": "Olá Maria! Posso te ajudar a agendar a consulta. Que dia funciona melhor?",
  "type": "ia",
  "horaLastMessage": "29/04/2026 14:32:15"
}
```

> O envio efetivo da mensagem para o paciente é feito via Evolution API (separada). Esta tabela registra o histórico.

---

## 5. Conversas / Tickets (`conversations` + `attendances`)

### `conversations` — registro de tickets ENCERRADOS

| Coluna       | Tipo      | Descrição                                           |
|--------------|-----------|-----------------------------------------------------|
| `session_id` | text      | = numero do paciente                                |
| `instancia`  | text      |                                                     |
| `reason`     | text      | `agendado` / `resolvido` / `encaminhado` / `desistiu` / `auto_encerrado` |
| `closed_at`  | timestamp | Quando foi encerrada                                |

### `attendances` — quem assumiu cada conversa ATIVA

| Coluna       | Tipo  | Descrição                                  |
|--------------|-------|--------------------------------------------|
| `numero`     | text  | Telefone do paciente (PK composta)         |
| `instancia`  | text  | (PK composta)                              |
| `user_id`    | uuid  | FK → users.id                              |
| `assumed_at` | ts    | Quando assumiu                             |

### 5.1 Encerrar conversa com motivo

```http
POST /conversations
```

**Body:**
```json
{
  "session_id": "5511987654321@s.whatsapp.net",
  "instancia": "clinicaolhos",
  "reason": "agendado",
  "closed_at": "2026-04-29T14:35:00Z"
}
```

> Após encerrar, **deletar** o registro de `attendances` para liberar a conversa.

### 5.2 Listar tickets encerrados em período

```http
GET /conversations?instancia=eq.{{instancia}}&closed_at=gte.2026-04-01&order=closed_at.desc
```

### 5.3 Conversa está aberta?

Não está em `conversations` (= não encerrada) e tem mensagem em `mensagens_geral`. Query indireta:

```http
GET /conversations?instancia=eq.{{instancia}}&session_id=eq.{numero}
```
Vazio = ticket aberto.

---

## 6. Catálogo Clínico

### 6.1 Listar profissionais ativos

```http
GET /professionals?instancia=eq.{{instancia}}&active=eq.true&order=name.asc
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Dr. Carlos Mendes",
    "specialty": "Oftalmologia",
    "registration": "CRM 123456",
    "color": "#2563EB",
    "working_days": [1,2,3,4,5],
    "start_time": "08:00",
    "end_time": "18:00",
    "break_start": "12:00",
    "break_end": "13:00"
  }
]
```

### 6.2 Listar procedimentos

```http
GET /procedures?instancia=eq.{{instancia}}&active=eq.true&order=name.asc
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Consulta oftalmológica",
    "type": "consulta",
    "duration_min": 30,
    "default_price": 250.00,
    "professional_id": null
  }
]
```

### 6.3 Listar convênios ativos

```http
GET /insurance_plans?instancia=eq.{{instancia}}&active=eq.true&order=name.asc
```

### 6.4 Pegar valor de procedimento × convênio

```http
GET /procedure_prices?procedure_id=eq.{procedure_id}&insurance_plan_id=eq.{insurance_plan_id}
```

**Response:**
```json
[{ "procedure_id": "uuid-1", "insurance_plan_id": "uuid-2", "price": 180.00 }]
```

> Se vazio = sem preço cadastrado pra essa combinação. Usar `procedures.default_price` como fallback.

### 6.5 Catálogo completo em uma chamada (com joins)

```http
GET /procedures?instancia=eq.{{instancia}}&select=*,procedure_prices(insurance_plan_id,price,insurance_plans(name))
```

---

## 7. Agenda (`agendas` + `appointments`)

### `agendas` — calendários da clínica

| Coluna           | Tipo   | Descrição                              |
|------------------|--------|----------------------------------------|
| `id`             | uuid   | PK                                     |
| `instancia`      | text   |                                        |
| `name`           | text   | Nome (ex: "Dr. Carlos")                |
| `color`          | text   |                                        |
| `working_days`   | int[]  | [1,2,3,4,5] = seg a sex                |
| `start_time`     | time   | 08:00                                  |
| `end_time`       | time   | 18:00                                  |
| `slot_minutes`   | int    | 30                                     |
| `professional_id`| uuid   | FK opcional                            |

### `appointments` — agendamentos

| Coluna              | Tipo   | Descrição                                                 |
|---------------------|--------|-----------------------------------------------------------|
| `id`                | uuid   |                                                           |
| `instancia`         | text   |                                                           |
| `agenda_id`         | uuid   |                                                           |
| `professional_id`   | uuid   |                                                           |
| `procedure_id`      | uuid   |                                                           |
| `insurance_plan_id` | uuid   | nullable (particular)                                     |
| `patient_name`      | text   |                                                           |
| `patient_phone`     | text   | (`5511...@s.whatsapp.net` ou só dígitos)                  |
| `starts_at`         | timestamp | UTC                                                    |
| `ends_at`           | timestamp |                                                        |
| `status`            | text   | `agendado`/`confirmado`/`concluido`/`faltou`/`cancelado`  |
| `payment_status`    | text   | `pago`/`pendente`/null                                    |
| `price`             | numeric|                                                           |
| `notes`             | text   |                                                           |

### 7.1 Listar agendas

```http
GET /agendas?instancia=eq.{{instancia}}&order=name.asc
```

### 7.2 Buscar agendamentos do dia

```http
GET /appointments?instancia=eq.{{instancia}}&starts_at=gte.2026-04-29T00:00:00Z&starts_at=lt.2026-04-30T00:00:00Z&order=starts_at.asc
```

### 7.3 Buscar agendamentos do paciente

```http
GET /appointments?instancia=eq.{{instancia}}&patient_phone=eq.{numero}&order=starts_at.desc&limit=10
```

### 7.4 Buscar slots ocupados de um profissional na semana

```http
GET /appointments?instancia=eq.{{instancia}}&professional_id=eq.{prof_id}&starts_at=gte.2026-04-29&starts_at=lt.2026-05-06&status=neq.cancelado&select=starts_at,ends_at
```

> Para calcular slots LIVRES: pegue agenda do profissional (`agendas` ou `professionals.start_time/end_time/working_days`), gere todos os slots possíveis, subtraia os ocupados.

### 7.5 Criar agendamento

```http
POST /appointments
Prefer: return=representation
```

**Body:**
```json
{
  "instancia": "clinicaolhos",
  "agenda_id": "uuid-agenda",
  "professional_id": "uuid-prof",
  "procedure_id": "uuid-proc",
  "insurance_plan_id": "uuid-plan",
  "patient_name": "Maria Silva",
  "patient_phone": "5511987654321@s.whatsapp.net",
  "starts_at": "2026-05-02T14:00:00Z",
  "ends_at":   "2026-05-02T14:30:00Z",
  "status": "agendado",
  "payment_status": "pendente",
  "price": 180.00,
  "notes": "Primeira consulta"
}
```

### 7.6 Atualizar status de agendamento

```http
PATCH /appointments?id=eq.{appt_id}
```

**Body (confirma):**
```json
{ "status": "confirmado" }
```

**Body (concluir + marcar pago):**
```json
{ "status": "concluido", "payment_status": "pago" }
```

**Body (cancelar):**
```json
{ "status": "cancelado" }
```

### 7.7 Cancelar / deletar agendamento

```http
DELETE /appointments?id=eq.{appt_id}
```

---

## 8. Alertas (`alerts`)

Quando a IA não consegue resolver, cria um alerta pra atendente humano.

| Coluna         | Tipo  | Descrição                              |
|----------------|-------|----------------------------------------|
| `id`           | uuid  |                                        |
| `instancia`    | text  |                                        |
| `contactName`  | text  | Nome do paciente (se conhecido)        |
| `phone`        | text  | Telefone                               |
| `type`         | text  | `help` / `schedule` / `urgent`         |
| `message`      | text  | Descrição do que a IA precisa de ajuda |
| `resolved`     | bool  | Default false                          |
| `forwarded_to` | uuid  | FK → users.id (opcional)               |
| `created_at`   | ts    |                                        |

### 8.1 Criar alerta (IA pediu ajuda)

```http
POST /alerts
Prefer: return=representation
```

**Body:**
```json
{
  "instancia": "clinicaolhos",
  "contactName": "Maria Silva",
  "phone": "5511987654321",
  "type": "help",
  "message": "Paciente está perguntando se o convênio Bradesco cobre cirurgia refrativa. Não tenho essa info — preciso de atendente humano.",
  "resolved": false
}
```

### 8.2 Listar alertas pendentes

```http
GET /alerts?instancia=eq.{{instancia}}&resolved=eq.false&order=created_at.desc
```

### 8.3 Marcar alerta como resolvido

```http
PATCH /alerts?id=eq.{alert_id}
```

**Body:**
```json
{ "resolved": true }
```

---

## 9. Atividades / Kanban

Tarefas internas da clínica (follow-up de paciente, cobrança, manutenção, etc).

### 9.1 Listar colunas

```http
GET /kanban_columns?instancia=eq.{{instancia}}&order=position.asc
```

### 9.2 Listar cards

```http
GET /kanban_cards?instancia=eq.{{instancia}}&order=position.asc
```

### 9.3 Criar card de tarefa (IA detectou follow-up necessário)

```http
POST /kanban_cards
```

**Body:**
```json
{
  "instancia": "clinicaolhos",
  "column_id": "uuid-coluna-a-fazer",
  "title": "Confirmar consulta de Maria amanhã 14h",
  "description": "Paciente não respondeu confirmação automática.",
  "priority": "alta",
  "due_date": "2026-05-02",
  "position": 0
}
```

---

## 10. Receitas comuns para IA

### 10.1 IA recebe nova mensagem — fluxo de contexto

1. **Buscar paciente:** `GET /saved_contacts?numero=eq.{numero}&instancia=eq.{{instancia}}&limit=1`
2. **Últimas 20 mensagens:** `GET /mensagens_geral?numero=eq.{numero}&instancia=eq.{{instancia}}&order=id.desc&limit=20`
3. **Próximos agendamentos:** `GET /appointments?patient_phone=eq.{numero}&instancia=eq.{{instancia}}&starts_at=gte.{hoje}&order=starts_at.asc&limit=5`
4. **Catálogo (cache 1h):** `GET /procedures?instancia=eq.{{instancia}}&active=eq.true`

Use esses 4 dados pra montar o contexto antes de gerar resposta.

### 10.2 IA decide agendar

1. Buscar profissional: `GET /professionals?id=eq.{prof_id}&instancia=eq.{{instancia}}`
2. Buscar agendamentos da semana do profissional pra ver slots ocupados (7.4)
3. Buscar preço pelo convênio do paciente (6.4)
4. Criar agendamento (7.5)
5. Inserir mensagem confirmando para paciente em `mensagens_geral` (4.4)
6. Encerrar conversa com `reason=agendado` em `conversations` (5.1)

### 10.3 IA não soube responder

1. Criar alerta pra equipe humana (8.1) com contexto
2. Inserir mensagem amigável pro paciente: *"Vou passar sua dúvida pra alguém da equipe agora — em alguns minutos te respondemos."*

### 10.4 Auto-encerrar tickets inativos

A própria plataforma faz isso automaticamente após 2h sem atividade (status `auto_encerrado`). Se sua IA precisar fazer manualmente, é só inserir em `conversations` com `reason=auto_encerrado` e deletar de `attendances`.

---

## Limites e quotas

- **Limite de profissionais cadastrados:** definido pelo plano da empresa (3 no Starter, 25 no Pro, ilimitado no Business)
- **Limite de agendas:** 1 no Starter, ilimitado no Pro+
- **Mensagens/Pacientes/Procedimentos:** sem limite
- **Rate limit Supabase REST:** 1000 req/min por anon_key

---

## Ambiente de testes

Não temos sandbox separado — toda integração é feita direto na instância da empresa em produção. Recomendado:

1. **Criar instância de teste** (entrar em contato com a Nexla pra liberar uma `instancia=teste-{seu-projeto}`)
2. Cadastrar 2-3 pacientes fake
3. Validar fluxos de ponta-a-ponta antes de plugar na clínica real

---

## Suporte

- **Webhook de eventos** (em desenvolvimento): vamos expor um webhook que dispara em eventos críticos (nova mensagem, agendamento criado, alerta).
- **Endpoint de envio efetivo de mensagem WhatsApp**: usar Evolution API diretamente — `POST {{evolution_url}}/message/sendText/{{instancia}}` com header `apikey: {{api_instancia}}`.
- **Dúvidas de integração:** WhatsApp do time MedicinaMKT.

---

*Última atualização: 2026-04-29 · v1*
