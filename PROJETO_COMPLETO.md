# 📋 AGENDA FÁCIL - Documentação Completa do Projeto

## 🎯 Visão Geral

**Agenda Fácil** é uma aplicação web full-stack para gerenciamento de agendamentos e análise financeira de prestadores de serviços (cabeleireiros, consultórios, studios, etc).

- **Frontend:** Next.js 15.5.12 (React)
- **Backend:** Firebase Firestore + Cloud Functions
- **Autenticação:** Firebase Auth
- **Payment Gateway:** MercadoPago Integration
- **Deployment:** Vercel

---

## 📊 Arquitetura do Banco de Dados (Firestore)

### Estrutura Hierárquica

```
firestore/
├── users/                          # Usuários do sistema
│   └── {userId}/                   # ID do usuário (gerado pelo Firebase Auth)
│       ├── profile                 # Dados pessoais
│       │   ├── email: string
│       │   ├── name: string
│       │   ├── phone: string
│       │   ├── avatar: string (---

## 🧪 Estratégia de Testes

### **Necessidade Crítica**
Um aplicativo financeiro onde bugs podem exibir valores errados para clientes requer testes automatizados. Recomendação: cobertura mínima de 60% em helpers críticos.

### **Escopo Recomendado (MVP de testes)**

**1. Testes de Helpers de Data** (3-4 horas)
```typescript
// src/lib/__tests__/helpers.test.ts
describe('ensureTimestamp', () => {
  test('converts string YYYY-MM-DD to Timestamp');
  test('returns Timestamp if already Timestamp');
  test('handles null/undefined gracefully');
  test('throws on invalid date format');
});

describe('timestampToDate', () => {
  test('converts Timestamp to Date');
  test('returns null if input is null');
  test('maintains timezone correctness (pt-BR)');
});
```

**2. Testes de Cálculos Financeiros** (3-4 horas)
```typescript
// src/lib/__tests__/financial.test.ts
describe('Financial Calculations', () => {
  test('calculates total revenue correctly');
  test('calculates total expenses correctly');
  test('calculates profit margin correctly');
  test('handles edge case: zero revenue');
  test('handles edge case: only expenses, no revenue');
  test('ticket médio calculation is accurate');
});
```

**3. Testes de Validação de Agendamento** (2-3 horas)
```typescript
// src/lib/__tests__/appointment.test.ts
describe('Appointment Validation', () => {
  test('rejects conflicting time slots');
  test('rejects appointments outside business hours');
  test('rejects appointments on holidays');
  test('accepts valid appointment');
});
```

### **Stack de Testes**
- **Jest** - Framework (já instalado via Next.js)
- **React Testing Library** - Para componentes (opcional, mas recomendado)
- **Mock Firebase** - Para testes sem conectar a DB real

### **Implementação**
- Estimado: **8-10 horas** (incluindo setup inicial)
- Prioridade: **IMPORTANTE** (após as críticas de produção)
- Quando: Após batched writes estar implementado

---

## 💳 Status da Integração MercadoPago

### **Situação Atual (Março 2026)**
✅ **O que já está implementado:**
- SDK oficial do Mercado Pago integrado (`mercadopago`)
- Variável de ambiente `MERCADO_PAGO_ACCESS_TOKEN` configurada no projeto
- API route `POST /api/mercadopago/preference` com validação via Zod
- Criação real de preferência de pagamento e retorno de `init_point`
- Botão "Pagar com Mercado Pago" no agendamento público com redirecionamento automático
- `back_urls` configuradas para `success`, `failure` e `pending`

⚠️ **O que ainda está pendente:**
- Webhook para confirmação assíncrona de pagamento
- Persistência e conciliação de status de pagamento no Firestore
- Fluxo de pós-pagamento completo (atualização automática do agendamento/transação)
- Páginas finais de retorno de pagamento (`/agendar/confirmado`, `/agendar/erro`, `/agendar/pendente`)

### **Implicação para Usuário Final**
O cliente já consegue ser redirecionado para o checkout do Mercado Pago.  
A confirmação final do pagamento ainda não volta automaticamente para o sistema, pois o webhook e a conciliação ainda não foram implementados.

### **Roadmap de Finalização**
- Implementar webhook de pagamentos do Mercado Pago
- Registrar transação e status no Firestore
- Sincronizar status do agendamento após `approved`/`rejected`
- Criar páginas finais de retorno e feedback claro ao cliente
- Estimado: 4-6 horas (parte restante)

---

## 🚨 Tratamento de Erros e Error Boundaries

### **Status Atual (Março 2026)**
✅ **Melhorias já aplicadas:**
- Login e registro com mapeamento de erros do Firebase para mensagens em português
- `useAuth` com timeout de inicialização e fallback para evitar loading infinito
- `try/catch` em fluxos críticos (agendamento público, reagendamento, dashboard)
- Componente `ErrorBoundary` criado em `src/components/ErrorBoundary.tsx`

⚠️ **Pendências:**
- Integrar `ErrorBoundary` no layout global
- Centralizar tratamento de erro em um handler reutilizável
- Padronizar feedback de sucesso/erro/carregamento para todas as telas

### **Esforço restante estimado:** 3-5 horas

---

## 📊 Monitoramento e Observabilidade em Produção

### **Status Atual**
❌ Sentry/Crashlytics ainda não integrados.

### **Por que é crítico**
Quando um erro acontece na aplicação de um cliente real em produção, você precisa saber:
- O que aconteceu?
- Qual usuário foi afetado?
- Em qual página/funcionalidade?
- Com qual frequência ocorre?

Sem monitoramento, você descobre apenas se o cliente ligar reclamando.

### **Solução Recomendada**

**1. Sentry (Error Tracking)** (4-5 horas)
```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Em pages problemáticas:
try {
  await deleteClient(...)
} catch (error) {
  Sentry.captureException(error, {
    tags: { userId, action: 'delete-client' }
  });
}
```

**Dashboard Sentry oferece:**
- 📍 Rastreamento de todos os erros
- 👤 Identificação de qual usuário teve problema
- 📈 Gráficos de frequência
- 🔔 Alertas em tempo real (quando novos erros aparecem)
- 🔍 Stack trace completo para debugar

**2. Firebase Crashlytics** (2-3 horas - alternativa)
```typescript
// Já integrado se Firebase Cloud Functions for usado
import { initializeAppCheck } from 'firebase/app-check';

// Log estruturado:
logEvent('appointment_created', {
  userId,
  clientId,
  serviceId,
  timestamp: new Date()
});
```

**3. Custom Analytics** (2 horas)
```typescript
// Métricas de negócio:
// - Quantos agendamentos/dia
// - Taxa de sucesso de criação
// - Tempo médio de carregamento da UI
// - Taxa de erro por funcionalidade
```

### **Estimado:** 6-8 horas (prioridade: IMPORTANTE, após críticas)
### **Recomendação:** Comece com Sentry (mais simples, mais barato)

---)
│       │   └── createdAt: Timestamp
│       │
│       ├── settings/
│       │   └── business            # Configurações do negócio
│       │       ├── businessName: string
│       │       ├── phone: string
│       │       ├── schedule: {
│       │       │   segunda: { enabled: boolean, open: "HH:MM", close: "HH:MM" }
│       │       │   terça: { ... }
│       │       │   quarta: { ... }
│       │       │   quinta: { ... }
│       │       │   sexta: { ... }
│       │       │   sábado: { ... }
│       │       │   domingo: { ... }
│       │       ├── timeBetweenAppointments: number (minutos)
│       │       ├── holidays: string[] (datas em "YYYY-MM-DD")
│       │       ├── cancellationPolicy: {
│       │       │   minHoursNotice: number
│       │       │   penaltyPercentage: number
│       │       ├── notifications: {
│       │       │   sendEmailReminder: boolean
│       │       │   reminderHoursBefore: number
│       │       │   sendSMSReminder: boolean
│       │       │   notifyOnNewAppointment: boolean
│       │       └── publicUrl: string (link para agendamento público)
│       │
│       ├── services/               # Serviços oferecidos
│       │   └── {serviceId}/
│       │       ├── name: string
│       │       ├── description: string
│       │       ├── duration: number (minutos)
│       │       ├── price: number (R$)
│       │       ├── isActive: boolean
│       │       └── createdAt: Timestamp
│       │
│       ├── appointments/           # Agendamentos
│       │   └── {appointmentId}/
│       │       ├── clientId: string (referência para clients)
│       │       ├── clientName: string
│       │       ├── clientPhone: string
│       │       ├── serviceId: string (referência para services)
│       │       ├── serviceName: string
│       │       ├── price: number
│       │       ├── date: Timestamp
│       │       ├── time: string (HH:MM)
│       │       ├── professionalId?: string
│       │       ├── professionalName?: string
│       │       ├── status: "agendado" | "confirmado" | "concluido" | "cancelado"
│       │       ├── notes: string
│       │       └── createdAt: Timestamp
│       │
│       ├── professionals/          # Profissionais (cadastro simples)
│       │   └── {professionalId}/
│       │       ├── name: string
│       │       ├── phone: string
│       │       ├── specialty: string
│       │       ├── commissionRate: number (0-100)
│       │       ├── isActive: boolean
│       │       ├── serviceIds?: string[] (IDs de services que realiza)
│       │       └── createdAt: Timestamp
│       │
│       ├── clients/                # Base de clientes
│       │   └── {clientId}/
│       │       ├── name: string
│       │       ├── phone: string
│       │       ├── email: string
│       │       ├── address: string
│       │       ├── city: string
│       │       ├── zipCode: string
│       │       ├── totalSpent: number
│       │       ├── totalAppointments: number
│       │       ├── lastAppointment: Timestamp
│       │       ├── joinedAt: Timestamp
│       │       └── clientHistory/  # Histórico de agendamentos
│       │           └── {historyId}/
│       │               ├── date: Timestamp
│       │               ├── service: string
│       │               ├── price: number
│       │               └── status: string
│       │
│       ├── services/               # Serviços (duplicado acima para clareza)
│       │   └── {serviceId}/
│       │       ├── ...
│       │
│       ├── expenses/               # Despesas
│       │   └── {expenseId}/
│       │       ├── description: string
│       │       ├── amount: number (R$)
│       │       ├── category: "material" | "aluguel" | "salário" | "outro"
│       │       ├── date: Timestamp
│       │       ├── paymentMethod: "dinheiro" | "débito" | "crédito" | "PIX"
│       │       └── createdAt: Timestamp
│       │
│       └── transactions/           # Transações de pagamento
│           └── {transactionId}/
│               ├── appointmentId: string
│               ├── amount: number
│               ├── method: "PIX" | "dinheiro" | "cartão"
│               ├── status: "pendente" | "pago" | "cancelado"
│               ├── mercadopagoId: string (opcional)
│               └── createdAt: Timestamp
```

---

## 🔄 Fluxos Principais do Aplicativo

### 1️⃣ **FLUXO DE AUTENTICAÇÃO**

```
┌─────────────────────────────────────────┐
│   Novo Usuário Acessa o App             │
└────────────────┬────────────────────────┘
                 │
        ┌────────▼────────┐
        │   Página Login  │
        └────────┬────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼────┐            ┌─────▼──────┐
│ Cadastro│            │Login com E-│
│Registro │            │mail/Senha  │
└───┬────┘            └─────┬──────┘
    │                       │
    │    ┌──────────────────┘
    │    │
    └────▼─────────────────────┐
         │ Firebase Auth       │
         │ (cria novo usuário) │
         └──────────┬──────────┘
                    │
        ┌───────────▼──────────┐
        │ Subcollection criada │
        │ em /users/{userId}   │
        │ - profile            │
        │ - settings/business  │
        └───────────┬──────────┘
                    │
        ┌───────────▼──────────┐
        │ AuthProvider atualiz │
        │ contexto com user    │
        └───────────┬──────────┘
                    │
        ┌───────────▼──────────┐
        │ Redireciona para     │
        │ /dashboard           │
        └──────────────────────┘
```

---

### 2️⃣ **FLUXO DE AGENDAMENTO (Dashboard Interno)**

```
┌─────────────────────────────────┐
│   Página /agendamentos          │
│   Usuário autenticado           │
└────────────────┬────────────────┘
                 │
        ┌────────▼────────┐
        │ Carrega dados   │
        │ - Services      │
        │ - Appointments  │
        │ - Clients       │
        └────────┬────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼────────────┐    ┌─────▼─────────┐
│ Visualização   │    │ Botão "Novo   │
│ Calendário     │    │ Agendamento"  │
│ (React Big Cal)│    └─────┬─────────┘
└────────┬───────┘          │
         │            ┌─────▼──────────────┐
         │            │ Modal/Formulário   │
         │            │ - Seleciona cliente│
         │            │ - Seleciona serviço│
         │            │ - Data/Hora        │
         │            │ - Notas            │
         │            └─────┬──────────────┘
         │                  │
         │          ┌───────▼────────┐
         │          │ Valida campos  │
         │          │ Valida slots   │
         │          │ (sem conflitos)│
         │          └───────┬────────┘
         │                  │
         │          ┌───────▼─────────────┐
         │          │ addSubDocument()    │
         │          │ em /users/{userId}/ │
         │          │ appointments/       │
         │          └───────┬─────────────┘
         │                  │
         │          ┌───────▼──────────┐
         │          │ Atualiza cliente │
         │          │ (totalSpent,     │
         │          │  totalApts)      │
         │          └───────┬──────────┘
         │                  │
         │          ┌───────▼─────────┐
         │          │ Sucesso! Modal  │
         │          │ fecha e lista   │
         │          │ recarrega       │
         │          └────────┬────────┘
         │                   │
         └───────────────────┴──────┐
                            │       │
                      ┌─────▼──┐    │
                      │Exibir  │    │
                      │em Cal  │    │
                      │e Lista │    │
                      └────────┘    │
                            ┌───────▼─────┐
                            │ Clientes    │
                            │ podem editar│
                            │ ou cancelar │
                            └─────────────┘
```

---

### 3️⃣ **FLUXO DE AGENDAMENTO PÚBLICO (Link Compartilhável)**

```
┌────────────────────────────────────┐
│   Cliente acessa link público      │
│   https://agenda-facil.com/        │
│   agendar/{userId}                 │
└─────────────────┬──────────────────┘
                  │
         ┌────────▼────────┐
         │ Carrega dados   │
         │ - Serviços ativ │
         │ - Horários      │
         │ - Feriados      │
         └────────┬────────┘
                  │
    ┌─────────────┴──────────────┐
    │                            │
┌───▼──────────┐    ┌──────────▼──────┐
│ STEP 1:      │    │ STEP 2:         │
│ Selecionar   │    │ Data/Hora       │
│ Serviço      │    │ - Calendário    │
│              │    │ - Horários livres
└───┬──────────┘    └──────────┬──────┘
    │                          │
    └──────────────┬───────────┘
                   │
            ┌──────▼──────────┐
            │ STEP 3: Dados   │
            │ Cliente         │
            │ - Nome          │
            │ - Telefone      │
            │ - Email (opt)   │
            │ - Notas (opt)   │
            └──────┬──────────┘
                   │
            ┌──────▼──────────┐
            │ STEP 4:         │
            │ Confirmação     │
            │ - Resumo        │
            │ - Link Pagamento│
            │   (MercadoPago) │
            └──────┬──────────┘
                   │
            ┌──────▼──────────┐
            │ addSubDocument()│
            │ /users/{userId}/│
            │ appointments/   │
            │ + email notif   │
            └──────┬──────────┘
                   │
            ┌──────▼──────────┐
            │ Sucesso!        │
            │ Mensagem de     │
            │ confirmação     │
            └─────────────────┘
```

---

### 4️⃣ **FLUXO FINANCEIRO**

```
┌────────────────────────────┐
│   Página /financeiro       │
└─────────────────┬──────────┘
                  │
    ┌─────────────▼────────────┐
    │ Filtro de Período:       │
    │ - Este mês               │
    │ - Trimestre              │
    │ - Este ano               │
    │ - Custom (data range)    │
    └─────────────┬────────────┘
                  │
    ┌─────────────▼────────────────────────┐
    │ Calcula Análise Financeira:          │
    │                                      │
    │ Total Receita = SUM(appointments     │
    │                    no período)       │
    │                                      │
    │ Total Despesas = SUM(expenses        │
    │                     no período)      │
    │                                      │
    │ Lucro Líquido = Receita - Despesas   │
    │ Margem = (Lucro / Receita) * 100%    │
    │                                      │
    │ Ticket Médio = Receita / Appts       │
    └─────────────┬────────────────────────┘
                  │
    ┌─────────────▼────────────┐
    │ Visualizações:           │
    │ ┌──────────────────────┐ │
    │ │ Cards de Resumo:     │ │
    │ │ - Total Receita      │ │
    │ │ - Total Despesas     │ │
    │ │ - Lucro Líquido      │ │
    │ │ - Margem %           │ │
    │ └──────────────────────┘ │
    │ ┌──────────────────────┐ │
    │ │ BarChart:            │ │
    │ │ Receita/Despesa/     │ │
    │ │ Lucro por dia        │ │
    │ │ (últimos 30 dias)    │ │
    │ └──────────────────────┘ │
    │ ┌──────────────────────┐ │
    │ │ Tabela de Despesas:  │ │
    │ │ [CRUD] Delete/Edit   │ │
    │ └──────────────────────┘ │
    └─────────────┬────────────┘
                  │
    ┌─────────────▼──────────────────┐
    │ Ações (CRUD Despesas):         │
    │                                │
    │ Adicionar Despesa:             │
    │ - Descrição                    │
    │ - Valor                        │
    │ - Categoria (material/etc)     │
    │ - Data                         │
    │ - Método de pagamento          │
    │ └─> Salva em /expenses         │
    │                                │
    │ Editar Despesa:                │
    │ └─> updateSubDocument()        │
    │                                │
    │ Deletar Despesa:               │
    │ └─> deleteSubDocument()        │
    └────────────────────────────────┘
```

---

### 5️⃣ **FLUXO DE CONFIGURAÇÕES**

```
┌──────────────────────┐
│  Página /configuracoes
└──────────────┬───────┘
               │
    ┌──────────▼──────────┐
    │ 4 ABAS:             │
    └──────────┬──────────┘
               │
    ┌──────────┴──────────┬──────────┬────────────┐
    │                     │          │            │
┌───▼──────┐      ┌──────▼───┐  ┌──▼─────┐  ┌───▼────────┐
│ ABA 1:   │      │ ABA 2:   │  │ABA 3:  │  │ ABA 4:     │
│ GERAL    │      │HORÁRIOS  │  │CANCEL. │  │NOTIFICAÇÕES
└───┬──────┘      └──────┬───┘  └──┬─────┘  └───┬────────┘
    │                    │          │            │
    │ Nome negócio       │ Por dia: │ Mín hrs    │ Email
    │ Telefone           │ Hab/Des  │ aviso      │ reminders
    │ Link público       │ Open/Cls │ Penalidade│ SMS
    │                    │ Intervalo│ %         │ Notif novo
    │                    │ entre    │           │ agendamento
    │                    │ serviços │           │
    │                    │          │           │
    │                    │ Feriados │           │
    │                    │ + Datas  │           │
    │                    │ - Datas  │           │
    │                    │          │           │
    └─────────────────────┴──────────┴───────────┴─────┐
                                                       │
                    ┌──────────────────────────────────┘
                    │
            ┌───────▼────────────┐
            │ setSubDocument()   │
            │ /users/{userId}/   │
            │ settings/business  │
            └───────┬────────────┘
                    │
            ┌───────▼──────────┐
            │ Dados salvos!    │
            │ Validação de     │
            │ horários         │
            └──────────────────┘
```

---

### 6️⃣ **FLUXO DE ANÁLISES**

```
┌──────────────────────┐
│  Página /analises    │
└──────────────┬───────┘
               │
    ┌──────────▼──────────────┐
    │ Filtro de Período:      │
    │ - Mês   │ - Trimestre   │
    │ - Ano   │ - Customizado │
    └──────────┬──────────────┘
               │
    ┌──────────▼──────────┐
    │ 4 ABAS:             │
    └──────────┬──────────┘
               │
    ┌──────────┴──────────┬──────────┬─────────────┐
    │                     │          │             │
┌───▼──────────┐  ┌──────▼────┐  ┌──▼──────┐  ┌───▼────────┐
│ ABA 1:       │  │ ABA 2:    │  │ABA 3:   │  │ ABA 4:     │
│ VISÃO GERAL  │  │ SERVIÇOS  │  │CLIENTES │  │TENDÊNCIAS  │
└───┬──────────┘  └──────┬────┘  └──┬──────┘  └───┬────────┘
    │                    │          │            │
    │ Cards:             │ Top 5    │ Clientes   │ Gráfico
    │ - Total Receita    │ serviços │ (ranking)  │ 6 meses
    │ - Total Despesas   │ por      │            │ - Receita
    │ - Lucro Líquido    │ receita  │ Status:    │ - Despesas
    │ - Margem %         │          │ - Regular  │ - Lucro
    │                    │ PieChart │ - Occasional
    │ BarChart:          │ distrib. │ - Dormant  │
    │ Receita/Despesa    │          │            │
    │ últimos 30 dias    │ Serviço  │ Potencial: │
    │                    │ com      │ - High     │
    │ ComposedChart:     │ melhor   │ - Medium   │
    │ 6 meses (trends)   │ margem   │ - Low      │
    │                    │          │            │
    │                    │ Tabela   │ Churn Risk │
    │                    │ detalh.  │ (>90 dias) │
    │                    │          │            │
    │                    │          │ Tabela     │
    │                    │          │ com dados  │
    └────────────────────┴──────────┴────────────┴─────────┘
```

---

### 7️⃣ **FLUXO DE CLIENTES**

```
┌────────────────────┐
│  Página /clientes  │
└─────────────┬──────┘
              │
    ┌─────────▼─────────┐
    │ Carrega Clientes  │
    │ /users/{userId}/  │
    │ clients/          │
    └─────────┬─────────┘
              │
    ┌─────────▼──────────────┐
    │ Lista de Clientes:     │
    │ (Tabela responsiva)    │
    │ - Nome                 │
    │ - Telefone             │
    │ - Total gasto          │
    │ - Total agendamentos   │
    │ - Último agendamento   │
    └─────────┬──────────────┘
              │
    ┌─────────┴──────────────┬──────────────────────┐
    │                        │                      │
┌───▼──────┐        ┌───────▼─────┐       ┌────────▼──┐
│ Adicionar│        │ Editar      │       │ Deletar   │
│ Cliente  │        │ Cliente     │       │ Cliente   │
│          │        │             │       │           │
│ Modal:   │        │ Modal:      │       │ Confirmação
│ - Nome   │        │ (mesmos     │       │           │
│ - Tel    │        │  campos)    │       │ Deleta:   │
│ - Email  │        │             │       │ - Cliente │
│ - End    │        │ updateSubDoc│       │ - Histórico
│ - Cidade │        │ ()          │       │ - Appts   │
│ - CEP    │        │             │       │           │
│          │        │             │       │ deleteSubD
│addSubDoc │        │             │       │oc()      │
│()        │        │             │       │           │
└────┬─────┘        └────┬────────┘       └────┬──────┘
     │                   │                     │
     │                   │                     │
     └───────────────────┴─────────────────────┘
                        │
            ┌───────────▼──────────┐
            │ Lista recarrega      │
            │ (useEffect listener) │
            └──────────────────────┘


┌──────────────────────────────────────┐
│ Ao clicar em Cliente:                │
│ - Abre histórico de agendamentos     │
│ - Timeline com datas formatadas      │
│ - Serviços prestados                 │
│ - Valores pagos                      │
│ - Status do agendamento              │
│ (usa getDateObject para compatibilid.)
└──────────────────────────────────────┘
```

---

## 🗄️ Operações de Banco de Dados

### **Padrão de Operações (firestoreService.ts)**

```typescript
// CREATE
addSubDocument<T>(
  collectionPath: string,
  documentId: string,
  subCollectionPath: string,
  data: T
): Promise<void>

// READ
getSubDocuments<T>(
  collectionPath: string,
  documentId: string,
  subCollectionPath: string,
  filters?: Filter[]
): Promise<T[]>

getSubDocument<T>(
  collectionPath: string,
  documentId: string,
  subCollectionPath: string,
  subDocumentId: string
): Promise<T | null>

// UPDATE
updateSubDocument(
  collectionPath: string,
  documentId: string,
  subCollectionPath: string,
  subDocumentId: string,
  data: Partial<T>
): Promise<void>

// DELETE
deleteSubDocument(
  collectionPath: string,
  documentId: string,
  subCollectionPath: string,
  subDocumentId: string
): Promise<void>
```

### **Exemplo de Uso**

```typescript
// Criar novo agendamento
await addSubDocument<Appointment>(
  'users',
  userId,
  'appointments',
  {
    clientId: client.id,
    clientName: client.name,
    serviceId: service.id,
    serviceName: service.name,
    price: service.price,
    date: Timestamp.fromDate(new Date(dateString)),
    time: timeString,
    status: 'agendado',
    notes: formData.notes,
    createdAt: Timestamp.now()
  }
);

// Buscar todos os serviços
const services = await getSubDocuments<Service>(
  'users',
  userId,
  'services'
);

// Buscar agendamentos com filtro
const appointments = await getSubDocuments<Appointment>(
  'users',
  userId,
  'appointments',
  [
    { field: 'date', operator: '>=', value: startDate },
    { field: 'date', operator: '<=', value: endDate }
  ]
);

// Atualizar cliente
await updateSubDocument(
  'users',
  userId,
  'clients',
  clientId,
  { totalSpent: newTotal }
);

// Deletar despesa
await deleteSubDocument(
  'users',
  userId,
  'expenses',
  expenseId
);
```

---

## 🔐 Segurança e Autenticação

### **Firebase Rules (Firestore)**

```
// Todos os dados são privados por usuário
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
  
  // Subcollections herdam as regras
  match /{allPaths=**} {
    allow read, write: if request.auth.uid == userId;
  }
}
```

### **Proteção de Rotas**

```typescript
// ProtectedRoute.tsx
// Verifica se usuário está autenticado
// Redireciona para /login se não

// AuthProvider.tsx
// Gerencia contexto global de autenticação
// useAuth hook customizado para usar em pages
```

---

## 📱 Páginas e Funcionalidades

| Página | Rota | Autenticação | Funcionalidades |
|--------|------|--------------|-----------------|
| **Dashboard** | `/dashboard` | ✅ Obrigatório | Cards de resumo, próximos agendamentos, stats |
| **Agendamentos** | `/agendamentos` | ✅ Obrigatório | Calendário, CRUD, filtros, lista |
| **Agendamento Público** | `/agendar/{userId}` | ❌ Público | Step-by-step com seleção de profissional + serviço filtrado, link compartilhável |
| **Reagendamento Público** | `/agendar/reagendar/{token}` | ❌ Público | Reagendamento com token e slots dinâmicos |
| **Confirmação Reagendamento** | `/agendar/confirmacao-reagendamento` | ❌ Público | Feedback de sucesso após reagendamento |
| **Clientes** | `/clientes` | ✅ Obrigatório | CRUD clientes, histórico, stats |
| **Serviços** | `/servicos` | ✅ Obrigatório | CRUD serviços, preços, duração |
| **Financeiro** | `/financeiro` | ✅ Obrigatório | Receita, despesas, lucro, charts, CRUD expenses |
| **Análises** | `/analises` | ✅ Obrigatório | 4 dashboards, rankings, tendências, 6 meses |
| **Configurações** | `/configuracoes` | ✅ Obrigatório | 4 abas, horários, feriados, notificações, políticas |
| **Dashboard do Profissional (visão do dono)** | `/profissional/dashboard` | ✅ Dono | Seleciona profissional + período, lista de atendimentos e total em comissões |
| **Gerenciar Profissionais** | `/profissional/gerenciar` | ✅ Dono | CRUD simples (Firestore) + ativar/desativar + vínculo de serviços |
| **Login** | `/login` | ❌ Público | Email/senha |
| **Registro** | `/register` | ❌ Público | Email/senha |

---

## 🛠️ Stack Tecnológico

### **Frontend**
- **Next.js 15.5.12** - React framework com SSR
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling responsivo
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas
- **Recharts 3.7.0** - Gráficos (BarChart, PieChart, ComposedChart)
- **React Big Calendar** - Calendário interativo
- **date-fns 4.1.0** - Manipulação de datas (locale: pt-BR)

### **Backend / Banco de Dados**
- **Firebase v12.0.0** - Autenticação + Firestore
- **@firebase/firestore 4.9.0** - SDK modular
- **Firebase Cloud Functions** - Functions ativas para disponibilidade e reagendamento (gestão de profissionais via Functions foi descontinuada no frontend)

### **Payment**
- **MercadoPago SDK** - Integração de pagamentos

### **Deployment**
- **Vercel** - Deploy automático via Git

---

## 📈 Fluxo de Dados (Resumido)

```
┌─────────────────┐
│  Usuário        │
│  (Browser)      │
└────────┬────────┘
         │ (HTTPS)
         │
    ┌────▼─────────┐
    │ Next.js      │
    │ Pages/Routes │
    └────┬─────────┘
         │ (Modular SDK)
         │
    ┌────▼──────────────────┐
    │ Firebase/Firestore    │
    │ - Autenticação        │
    │ - Database            │
    │ - Rules security      │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │ MercadoPago           │
    │ (pagamentos)          │
    └──────────────────────┘


Dados fluem em formato:
┌──────────────────────────────┐
│ TypeScript Type/Interface    │
│ (definido em types.ts)       │
│          ↓                    │
│ Firestore Document/Collection│
│ (stored como JSON)           │
│          ↓                    │
│ React State (useState)       │
│          ↓                    │
│ Componentes (render)         │
│          ↓                    │
│ UI no Browser                │
└──────────────────────────────┘
```

---

## ✅ O Que Foi Implementado

### **Fase 1 - Análise ✓**
- Estrutura do projeto analisada
- Riscos identificados
- Recomendações fornecidas

### **Fase 2 - Agendamentos ✓**
- Data handling padronizado (dual-format)
- CRUD completo
- Novo agendamento modal
- Calendário integrado
- Validação de slots

### **Fase 3 - Financeiro ✓**
- Dashboard de receita/despesa
- Gráficos (BarChart)
- CRUD de despesas
- Cálculo de lucro líquido e margem
- Ticket médio

### **Fase 4 - Configurações ✓**
- 4 abas (Geral, Horários, Cancelamento, Notificações)
- Gerenciamento de feriados
- Horários por dia da semana
- Políticas de cancelamento
- Configuração de notificações

### **Fase 5 - Análises ✓**
- 4 dashboards (Visão Geral, Serviços, Clientes, Tendências)
- Ranking de serviços
- Análise de clientes (potencial + churn risk)
- Gráficos 6 meses
- Filtros de período

### **Fase 6 - UI/UX ✓**
- Campos com bordas visíveis
- Texto preto forte
- Focus ring azul
- Calendar events compactos
- Responsive design

### **Fase 7 - Autenticação ✓**
- Firebase Auth integrado
- ProtectedRoute
- AuthProvider
- useAuth hook

### **Fase 8 - Agendamento Público ✓**
- Link compartilhável
- Step-by-step wizard
- MercadoPago com criação de preferência e redirect para checkout
- Geração de `reschedulingToken` e validade de 30 dias

### **Fase 9 - Reagendamento do Cliente ✓**
- Página pública `/agendar/reagendar/{token}`
- Cloud Functions para carregar dados e validar disponibilidade
- Atualização do agendamento por token (sem login)
- Página de confirmação de reagendamento

### **Fase 10 - Módulo Profissional ✓**
- **Cadastro simples (Firestore):** profissionais são documentos em `users/{userId}/professionals/{professionalId}` (sem login separado, sem Cloud Functions)
- `Professional` (inclui `serviceIds?: string[]` para vincular serviços), `ProfessionalLink` e `Commission` permanecem no projeto para referência/uso futuro
- `/profissional/gerenciar` (dono): CRUD + ativar/desativar + seleção de serviços que realiza
- `/profissional/dashboard` (dono): seleciona profissional + período (este mês / mês anterior) e vê atendimentos e comissões (baseado em `Appointment.price` e `Professional.commissionRate`)
- **Observação:** Cloud Functions `createProfessional`/`deactivateProfessional` existem no repositório, mas estão **ignoradas** no fluxo atual (não deletar)

### **Atualização - Profissional em Agendamentos ✓**
- `Appointment` suporta `professionalId?: string` e `professionalName?: string` (opcionais, retrocompatível)
- `/agendamentos` (interno): select opcional de profissional no modal de criar/editar agendamento
- `/agendar/{userId}` (público): novo Step 1 (profissional, com opção \"Sem preferência\") e Step 2 filtra serviços por `Professional.serviceIds` (com fallback quando não configurado)

### **Fase 11 - PWA e Notificações Web (Base) ✓**
- `manifest.json` + ícones PWA
- Registro de Service Worker em produção
- Banner para solicitar permissão de notificações
- Integração inicial com Firebase Messaging (token VAPID + listener)

### **Fase CRÍTICA - Correções de Produção ✓ (03 Mar 2026)**
- ✅ **Padronizar Timestamps** - Eliminar `date: Timestamp | string`
  - `Appointment.date` → SEMPRE `Timestamp`
  - `Appointment.time` → Novo campo separado em formato `HH:MM`
  - `Appointment.clientPhone` → Campo obrigatório adicionado
  - `Appointment.price` → Campo obrigatório adicionado
  - `Appointment.status` → Adicionado estado `'confirmado'`
  - `Client.lastAppointment` → SEMPRE `Timestamp` (nunca string)
  - `Client.totalSpent` e `Client.totalAppointments` → Campos novos
  - `Expense.date` → SEMPRE `Timestamp` (nunca string)
  - `Expense.category` → Corrigido para enum: `'material' | 'aluguel' | 'salário' | 'outro'`
  - Adicionados helpers: `ensureTimestamp()` e `timestampToDate()`
- ✅ Atualizado tipo `ClientHistory` interface separada
- ✅ Atualizado `BusinessSettings` com `publicUrl`
- ✅ Corrigidos tipos em 4 páginas: agendamentos, agendar, dashboard, financeiro
- ✅ **Build Status atualizado (09 Mar 2026):** compilação em 27.9s, 17 rotas (incluindo API), 0 erros de TypeScript

---

## 🚀 Próximas Fases (Roadmap de Produção)

### **CRÍTICAS (Próximas 2 semanas)**
- [ ] **Paginação nas Listagens** - Limitar docs por página (20-50 itens)
  - Modificar `firestoreService.ts` com `limit` + `offset`
  - Implementar em `/agendamentos`, `/clientes`, `/servicos`
  - Estimado: 4-5 horas

- [ ] **FieldValue.increment() nos Contadores** - Atomicidade
  - Atualizar `Client.totalSpent` e `totalAppointments` com `increment()`
  - Evitar desincronização quando falhas de conexão
  - Estimado: 2-3 horas

- [ ] **Batched Writes nas Deleções** - Integridade transacional (PRIORIDADE)
  - Deletar cliente + histórico + agendamentos em uma transação
  - Evitar corrupção de dados em produção
  - Estimado: 2-3 horas
  - **Motivo:** Corrupção de dados é mais urgente que performance

- [ ] **Remover Dados Duplicados em Appointments** - Normalização
  - Remover `clientName`, `clientPhone`, `serviceName` do appointment
  - Referências apenas: `clientId`, `serviceId`
  - Buscar dados na exibição
  - Estimado: 6-8 horas

### **IMPORTANTES (Semanas 3-4)**
- [ ] **reCAPTCHA no Agendamento Público** - Segurança
  - Proteger `/agendar/{userId}` contra spam/bots
  - Estimado: 2 horas

- [ ] **Mover Cálculos para Cloud Functions** - Performance
  - Receita, despesas, lucro (atualmente client-side)
  - Usar `FieldValue.serverTimestamp()`
  - Estimado: 8-10 horas

### **VALOR ALTO (Semanas 5-6)**
- [ ] **Integração WhatsApp Business** - Notificações críticas
  - Enviar lembretes via WhatsApp (acima de 80% de open rate)
  - Usar Twilio ou Nuvem Shop
  - Estimado: 6-8 horas

- [ ] **Sistema de Avaliações** - Engajamento
  - Post-serviço: 1-5 estrelas + comentário
  - Exibir no perfil do profissional
  - Estimado: 4-5 horas

- [ ] **Export PDF/CSV para Contabilidade** - Retenção
  - Extrato mensal financeiro
  - Usar jsPDF ou similar
  - Estimado: 4-5 horas

### **DIFERENCIAÇÃO & RECEITA (Semanas 7-12) - Alto Impacto de Negócio**

#### **Tier 1 - Impacto Imediato (Semana 7-8)** ⭐⭐⭐
- [✅] **Reagendamento pelo Cliente** (4-5h) - IMPLEMENTADO ✓
  - Link "Reagendar/Cancelar" no e-mail/WhatsApp de confirmação
  - Abre página com próximos 7 dias + horários disponíveis
  - Token seguro válido por 30 dias
  - Reduz fricção: cliente não precisa ligar
  - **Implementação:** 
    - `reschedulingTokenService.ts` com geração/validação de tokens
    - Página `/agendar/reagendar/[token]` para seleção de data/hora
    - Página `/agendar/confirmacao-reagendamento` para confirmação
    - handleBooking automático gera token ao criar agendamento
  - **Status:** ✅ Production Ready (build atualizado em 09/03/2026: 27.9s, 0 TS errors, 17 rotas)

- [ ] **Confirmação de Agendamento via WhatsApp** (6-8h)
  - Integrar Twilio ou WhatsApp Business API
  - Enviar link de confirmação: "Confirma seu horário? ✅ Sim / ❌ Cancelar"
  - Reduz no-show em até 60% (dado do mercado)
  - Implementação: Adicionar `whatsappConfirmation` status em Appointment
  - **Por quê agora:** Dor imediata do profissional, alta conversão

#### **Tier 2 - Diferenciação vs Trinks/iSalon (Semana 9-10)** ⭐⭐⭐
- [ ] **Mini Landing Page Pública + Fotos** (5-6h)
  - Página `/agendar/{userId}` com:
    - Logo/foto do negócio (upload simples)
    - Avaliações (★★★★★)
    - Galeria de fotos do trabalho (antes/depois)
    - Bio curta do profissional
  - Aumenta taxa de conversão em ~40%
  - **Por quê agora:** Diferencial visual vs concorrentes

- [ ] **Área do Cliente (Login Simples)** (8-10h)
  - Cliente final faz login com telefone/email
  - Vê seus próximos agendamentos
  - Vê histórico de serviços + valores
  - Pode reagendar/cancelar direto
  - **Por quê agora:** Feature ausente em Trinks, alto diferencial

#### **Tier 3 - Receita Recorrente (Semana 11-12)** ⭐⭐⭐
- [ ] **Pacotes e Planos de Fidelidade** (6-8h)
  - Estrutura: `packages/` subcollection
  - "Compre 10 cortes, ganhe 1 grátis"
  - "Pacote mensal ilimitado por R$ 150"
  - Integração com MercadoPago para pré-venda
  - **Por quê agora:** Receita recorrente = autônomo mais satisfeito

- [ ] **Cupons de Desconto** (4-5h)
  - Profissional cria cupons (ex: VOLTA10 = 10% off)
  - Dashboard sugere automaticamente: "12 clientes em risco. Enviar cupom?"
  - Estrutura: `coupons/` + `couponUsage/` tracking
  - **Por quê agora:** Reativa clientes dormentes, simples

- [ ] **Relatório MEI em PDF** (3-4h)
  - Botão "Gerar Relatório Mensal"
  - PDF com receitas, despesas, lucro
  - Profissional leva para contador
  - **Por quê agora:** Profissional paga, low effort, high value

#### **Tier 4 - Otimização de Receita (Semana 13+)**
- [ ] **Dashboard de Metas** (3-4h)
  - "Sua meta: R$ 5.000. Você está em 64%"
  - Gamification simples
  - Motiva uso diário do app

- [ ] **Lista de Espera (Waitlist)** (4-5h)
  - Quando slot é cancelado, notificar fila
  - `waitlist/` subcollection por horário

- [ ] **Múltiplos Serviços por Agendamento** (5-7h)
  - Cliente agenda: corte + escova + hidratação em 1 slot
  - Aumenta ticket médio
  - Mais complexo: requer validação de duração total

### **FUTURO (Após todas acima)**
- [ ] **Controle de Estoque** (8-10h) - "Coloração consome 50ml de tinta"
- [ ] **IA para Otimização de Horários** (6-8h) - Bloqueia slots com alto no-show
- [ ] **Fase 12** - App mobile (React Native)
- [ ] **Fase 13** - PWA + offline mode
- [ ] **Fase 14** - Backup automático
- [ ] **Fase 15** - Multi-profissional/Equipes

---

## � Qualidade de Código e Segurança

### **TypeScript**
- ✅ Strict mode ativado (`strict: true` em tsconfig.json)
- ✅ Todas as interfaces tipadas em `src/lib/types.ts`
- ✅ Zero tipos `any` em código novo
- ✅ Build com 0 erros de tipo

### **Padrões de Desenvolvimento**
- ✅ Arquivo único de tipos (`types.ts`) para single source of truth
- ✅ Serviços abstraídos em `firestoreService.ts` (DRY principle)
- ✅ Helper functions para conversões de data (`ensureTimestamp`, `timestampToDate`)
- ✅ Componentes reutilizáveis com Tailwind CSS
- ✅ Validação com Zod + React Hook Form

### **Firebase Firestore**
- ✅ Security Rules: cada usuário acessa apenas seus próprios dados
- ✅ Índices otimizados para queries principais
- ✅ Timestamps sempre `Timestamp` (não string)
- ✅ Sem dados duplicados (em progresso - Fase crítica)

### **Performance**
- ⚠️ Paginação: Não implementada (CRÍTICO para >500 docs)
  - Ação: Implementar limit/offset nas listagens
- ⚠️ Cloud Functions: Cálculos ainda no client-side
  - Ação: Mover agregações para backend

### **Segurança**
- ✅ Firebase Auth com email/senha + autenticação
- ✅ ProtectedRoute bloqueia acesso não autenticado
- ⚠️ Agendamento público sem CAPTCHA (IMPORTANTE: adicionar reCAPTCHA)
- ⚠️ MercadoPago: SDK pronto mas integração incompleta

---

## �📞 Suporte e Documentação

- **Firebase Docs:** https://firebase.google.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Firestore Structure:** Ver seção "Arquitetura do Banco de Dados"
- **Tipos TypeScript:** `src/lib/types.ts`
- **Serviços:** `src/lib/firestoreService.ts`

---

## 🎯 Estratégia de Produto - Por Que Essa Ordem?

### **O Problema Atual do Seu Público**
Seus usuários (cabeleireiros, consultórios, studios) têm **2 dores principais:**

1. **Clientes não aparecem** (no-show)
   - Agendum 40% de no-show é normal no setor
   - Cada no-show = receita perdida + slot vazio
   - **Solução:** Confirmação via WhatsApp reduz em até 60%

2. **Perdem clientes para concorrentes**
   - Trinks, iSalon, Agendor já têm muitas features
   - Profissional não sabe por onde começar a usar seu app
   - **Solução:** Mini landing page + Área do cliente (diferenciação visual)

### **A Ordem Importa Porque:**

**Semanas 1-4: Estabilidade** (CRÍTICAS + IMPORTANTES)
- Corrige bugs que podem quebrar em produção
- Adiciona testes/monitoramento (você dorme tranquilo)
- MercadoPago funciona de verdade

**Semanas 5-6: Resolva a Dor (WhatsApp + Reagendamento)**
- Cliente confirma via WhatsApp = no-show cai ↓
- Cliente reagenda sem ligar = profissional economiza tempo
- **Resultado:** Menos ligações, mais receita. Fácil vender isso.

**Semanas 7-8: Diferenciação (Landing page + Área do cliente)**
- Seu concorrente mostra: "Aqui agenda"
- Você mostra: Foto bonita + avaliações + galeria + histórico
- **Resultado:** Taxa de conversão sobe 40%, cliente fica mais engajado

**Semanas 9-10: Receita Recorrente (Pacotes + Cupons)**
- Profissional consegue vender "Pacote 10 cortes"
- Você consegue cobrar comissão ou premium
- **Resultado:** Receita do seu produto cresce, não depende só de ads

**Semanas 11+: Nice-to-have (Metas, Estoque, etc)**
- Gamification e otimizações que mantêm usuário usando diariamente

### **Por Que Essas 4 de Diferenciação Animam Mais:**

#### **1. Confirmação WhatsApp** (6-8h)
```
HOJE:
Profissional: "Lembrei os 15 clientes por ligação"

AMANHÃ:
Sistema: Envia automaticamente às 14h do dia anterior
"Olá Maria! Confirma seu corte amanhã às 14h? ✅ Sim / ❌ Cancelar"
Maria clica ✅ → Status atualiza em tempo real
Maria não responde → Profissional vê "aguardando" e liga só se precisar
```

**Tech:** Twilio SMS API (simples) ou WhatsApp Business API (mais bacana)  
**Impacto:** No-show cai de 40% para ~15%. Que mudança!

---

#### **2. Reagendamento pelo Cliente** (4-5h)
```
HOJE:
Cliente: "Oi, preciso marcar em outro dia"
Profissional: Tira do calendário manualmente, agenda de novo

AMANHÃ:
Email de confirmação tem link: "Precisa reagendar? Clique aqui"
Cliente clica → Vê próximos 7 dias com horários livres
Cliente escolhe → Automático, sem profissional fazer nada
```

**Tech:** Link com token seguro + disponibilidade dinâmica  
**Impacto:** Reduz 30 ligações/mês para 5. Profissional consegue atender mais clientes.

---

#### **3. Mini Landing Page + Fotos** (5-6h)
```
HOJE:
Link público é só o formulário branco
Cliente chega: "Ué, quem é? Por que vou agendar aqui?"

AMANHÃ:
/agendar/{userId} mostra:
┌─────────────────────┐
│  [FOTO NEGÓCIO]     │
│  Ana Silva - Studio │
│  ★★★★★ (24 reviews)│
│ "Cabelo TOP demais!"│
├─────────────────────┤
│ [GALERIA FOTOS]     │
│ Antes/Depois virado │
│ (12 fotos)          │
├─────────────────────┤
│ AGENDAR HORÁRIO     │
└─────────────────────┘
```

**Tech:** Novo schema em `BusinessSettings`: `logo`, `bio`, `galleryPhotos`, `reviews`  
**Impacto:** Taxa de conversão sobe 40%. Cliente sente confiança.

---

#### **4. Área do Cliente (Login Simples)** (8-10h)
```
HOJE:
Cliente agendou, recebeu confirmação. Agora?
Não sabe horário próximo, não vê histórico, não consegue reagendar

AMANHÃ:
Login simples (telefone/email)
Dashboard do cliente:
├── Próximos agendamentos (com lembretes)
├── Histórico de serviços (fotos antes/depois)
├── Valores pagos (recibo)
├── Botão "Reagendar" / "Cancelar"
└── Filtro por profissional (se multi-profissional)
```

**Tech:** Nova collection `clientUsers/` separada de business users  
**Impacto:** Cliente vira usuário ativo, não vira "fantasma" após agendamento

---

### **Por Que NÃO Fazer Essas Agora?**

❌ **Antes de fazer CRÍTICAS + IMPORTANTES:**
- Você pode ter bugs em produção e perder usuários
- Não tem testes = 1 feature nova pode quebrar 3 velhas
- Sem monitoramento = não sabe quando dá ruim

❌ **Antes de MercadoPago funcionar:**
- Profissional agenda, cliente não consegue pagar
- Você vira só agendador, não ganha com pagamentos
- Marca fica ruim: "App bonito mas não funciona tudo"

---

## 🔄 Implementação 1: Reagendamento pelo Cliente (✅ COMPLETO)

### **O que foi feito:**
Adicionada funcionalidade completa de reagendamento sem que o cliente precise ligar para o profissional.

### **Como Funciona:**

**1. Geração do Token (Automático)**
```
Cliente agenda agendamento
↓
Sistema gera token seguro (random/base64url)
- Expira em 30 dias
↓
Token armazenado em Appointment.reschedulingToken
```

**2. Link de Reagendamento**
```
Email de confirmação inclui:
"Precisa reagendar? Clique aqui: 
https://agenda-facil.com/agendar/reagendar/{TOKEN}"
```

**3. Fluxo de Reagendamento**
```
Cliente clica no link
↓
Validação do token (existência e expiração)
↓
Exibe página com:
- Detalhes do agendamento atual
- Próximos 7 dias calendário
- Horários disponíveis por dia
↓
Cliente seleciona nova data/hora
↓
Sistema atualiza agendamento no Firebase
↓
Confirmação com novo horário
```

### **Arquivos Criados/Modificados:**

**Novos Arquivos:**
- `src/lib/reschedulingTokenService.ts` - Geração e validação de tokens
- `src/app/agendar/reagendar/[token]/page.tsx` - Página de seleção de data/hora
- `src/app/agendar/confirmacao-reagendamento/page.tsx` - Página de confirmação

**Modificados:**
- `src/lib/types.ts` - Novos campos em `Appointment`
- `src/app/agendar/[userId]/page.tsx` - Geração automática de token
- `functions/src/index.ts` - Functions `getReschedulingData` e `rescheduleWithToken`

### **Campos Adicionados em Appointment:**
```typescript
reschedulingToken?: string;           // Token seguro para link público
reschedulingExpiresAt?: Timestamp;    // Expira em 30 dias
```

### **Validação de Token:**
```typescript
// Validação feita nas Cloud Functions:
- Encontrar appointment por reschedulingToken (collectionGroup)
- Validar expiração em reschedulingExpiresAt
- Validar disponibilidade antes de atualizar data/hora
```

### **Como Integrar com Email:**
Adicionar link no template de confirmação do agendamento:
```html
<p>Precisa mudar de horário?</p>
<a href="https://agenda-facil.com/agendar/reagendar/TOKEN">
  Reagendar Agora
</a>
```

### **Impacto:**
- ✅ Cliente economiza ligação
- ✅ Profissional reduz atendimento telefônico
- ✅ Taxa de reagendamento online sobe (estimado 80%+)
- ✅ Menos no-shows (cliente consegue mudar fácil)

---

### **O que está sólido ✅**
- Arquitetura TypeScript com tipos rigorosamente enforçados
- Modelo de dados Firestore bem estruturado
- CRUD funcional para todas as entidades principais
- Autenticação Firebase integrada
- Dashboard com análises e gráficos
- Agendamento público com step-by-step wizard
- Reagendamento público por token com validação server-side
- Módulo de profissionais com papéis `dono` e `profissional`
- Base de PWA e notificações push já conectada no frontend
- UI responsiva com Tailwind CSS
- **CRÍTICO RESOLVIDO:** Timestamps padronizados (eliminou root cause de bugs)

### **Roadmap de Produção Priorizado**

**CRÍTICAS (Próximas 2 semanas)** - Risco de corrupção/performance
1. Paginação nas listagens (4-5h)
2. FieldValue.increment() atômico (2-3h)
3. **Batched Writes em deleções** (2-3h) ⭐ Reordenado para antes
4. Normalização de appointments (6-8h)

**IMPORTANTES (Semanas 3-4)** - Risco de segurança/experiência
- Testes unitários (8-10h) - Risco financeiro real
- Finalizar Error Boundary global + handler central de erros (3-5h)
- Monitoramento (Sentry/Crashlytics) (6-8h)
- Finalizar MercadoPago (webhook + status transacional) (4-6h)
- reCAPTCHA no booking público (2h)

**DIFERENCIAÇÃO & RECEITA (Semanas 7-12)** - Alto impacto de negócio
- **Tier 1 (Imediato):** Confirmação WhatsApp (6-8h) + Reagendamento cliente (4-5h)
- **Tier 2 (Diferenciação):** Mini landing page pública (5-6h) + Área do cliente (8-10h)
- **Tier 3 (Receita recorrente):** Pacotes de fidelidade (6-8h) + Cupons (4-5h) + Relatório MEI (3-4h)
- **Tier 4 (Otimização):** Dashboard de metas (3-4h) + Lista de espera (4-5h) + Multi-serviços (5-7h)

### **Gaps Identificados pela Análise Externa**
1. ❌ Nenhum teste automatizado → Risco em app financeiro
2. ⚠️ MercadoPago parcial (checkout ok, sem webhook/status automático)
3. ⚠️ Tratamento de erro parcial (login/registro e fluxos críticos melhorados, sem handler central)
4. ❌ Sem observabilidade → Impossível debugar em produção

### **Próximo Passo Recomendado**
Implementar as 4 CRÍTICAS de produção (16-18h de trabalho = ~2 semanas), depois adicionar os 3 IMPORTANTES de qualidade (testing + errors + monitoring) antes de publicidade/marketing.

**Após estabilidade alcançada (fim semana 4):**
1. **Confirmação WhatsApp** (semana 5) → Reduz no-show imediatamente
2. **Reagendamento cliente** (semana 5-6) → Diminui fricção
3. **Mini landing page** (semana 7) → Aumenta conversão
4. **Área do cliente** (semana 8-9) → Diferencia vs Trinks/iSalon

Essa ordem é **produto**, não código. Cada feature resolve uma dor real do profissional.

---

**Última atualização:** Março 9, 2026 (v5 - profissionais via Firestore + profissional no agendamento público)  
**Status:** ✅ MVP sólido com agendamento público + reagendamento + gestão de profissionais (Firestore) + checkout Mercado Pago ativo  
**Build:** ✅ Passing (`npm run build` OK, 0 erros de TypeScript)  
**Recomendação de Deploy:** Concluir webhook do MercadoPago + observabilidade mínima antes de escalar tráfego  
**Entregas recentes:** 
- Checkout Mercado Pago via `/api/mercadopago/preference`
- Cloud Functions para disponibilidade e reagendamento com token
- Profissionais via Firestore (`users/{userId}/professionals`) com ativação/inativação e vínculo de serviços (`serviceIds`)
- `/agendamentos`: campo opcional de profissional no modal (salva `professionalId`/`professionalName` no agendamento)
- `/agendar/{userId}`: novo Step 1 (profissional + \"Sem preferência\") e Step 2 filtra serviços por profissional (com fallback)
- Rotas `/profissional/gerenciar` e `/profissional/dashboard` como visão do dono (sem login separado de profissional)
- Base de PWA + push notifications no frontend
