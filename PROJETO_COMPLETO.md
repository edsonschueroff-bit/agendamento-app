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

### **Situação Atual**
A documentação menciona "SDK pronto" mas há clareza importante:

✅ **O que está implementado:**
- SDK do MercadoPago incluído no projeto
- Step 4 do agendamento público exibe "Link Pagamento"
- Estrutura de transações no Firestore existe

❌ **O que NÃO está implementado:**
- Nenhuma chamada real ao MercadoPago API
- Nenhum webhook configurado para confirmar pagamentos
- Status de transação não atualiza automaticamente
- Cliente vê link mas clique não leva a lugar nenhum

### **Implicação para Usuário Final**
Atualmente, o agendamento público **não tem pagamento ativo**. Um cliente que completa o agendamento não é redirecionado para pagar. Isso deve estar explícito na UI ou desabilitado até estar pronto.

### **Roadmap de Implementação**
- **Fase IMPORTANTE (Semana 4):** Integração MercadoPago completa
  - Criar access token com credenciais de produção/sandbox
  - Implementar chamada na etapa de pagamento
  - Configurar webhooks para `payment.created`, `payment.confirmed`
  - Atualizar status da transação em tempo real
  - Exibir confirmação clara para cliente
  - Estimado: 6-8 horas

---

## 🚨 Tratamento de Erros e Error Boundaries

### **Gaps Atuais**
O projeto não menciona como erros são tratados:
- Erros do Firestore são "engolidos" silenciosamente?
- Como usuário sabe se agendamento foi criado?
- Qual feedback recebe se perde conexão?

### **Implementação Recomendada**

**1. Error Boundary (React)** (2-3 horas)
```typescript
// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  // Captura erros em renderização
  // Exibe fallback UI elegante
  // Envia erro para Sentry
}

// Em layout.tsx:
<ErrorBoundary>
  <AuthProvider>
    {children}
  </AuthProvider>
</ErrorBoundary>
```

**2. API Error Handler** (2 horas)
```typescript
// src/lib/errorHandler.ts
async function handleFirestoreError(error: any, context: string) {
  // Log estruturado (Sentry)
  // Toast para usuário (explicação em português)
  // Retry automático em casos específicos
  // Fallback gracioso
}

// Em pages:
try {
  await addSubDocument(...)
} catch (error) {
  await handleFirestoreError(error, 'criar-agendamento');
}
```

**3. Toast Notifications** (1-2 horas)
- Feedback visual em português para cada ação
- Success: "Agendamento criado com sucesso!"
- Error: "Erro ao criar agendamento. Tente novamente"
- Loading: "Salvando agendamento..."

### **Estimado:** 5-7 horas (prioridade: IMPORTANTE)

---

## 📊 Monitoramento e Observabilidade em Produção

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
│       │       ├── date: Timestamp | string (YYYY-MM-DD)
│       │       ├── time: string (HH:MM)
│       │       ├── status: "agendado" | "confirmado" | "cancelado" | "concluído"
│       │       ├── notes: string
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
│       │       ├── lastAppointment: Timestamp | string
│       │       ├── joinedAt: Timestamp
│       │       └── clientHistory/  # Histórico de agendamentos
│       │           └── {historyId}/
│       │               ├── date: Timestamp | string
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
│       │       ├── date: Timestamp | string (YYYY-MM-DD)
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
| **Novo Agendamento** | `/agendar/novo` | ✅ Obrigatório | Formulário step-by-step, validação |
| **Agendamento Público** | `/agendar/{userId}` | ❌ Público | Step-by-step, link compartilhável |
| **Clientes** | `/clientes` | ✅ Obrigatório | CRUD clientes, histórico, stats |
| **Serviços** | `/servicos` | ✅ Obrigatório | CRUD serviços, preços, duração |
| **Financeiro** | `/financeiro` | ✅ Obrigatório | Receita, despesas, lucro, charts, CRUD expenses |
| **Análises** | `/analises` | ✅ Obrigatório | 4 dashboards, rankings, tendências, 6 meses |
| **Configurações** | `/configuracoes` | ✅ Obrigatório | 4 abas, horários, feriados, notificações, políticas |
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
- **Firebase Cloud Functions** - Functions serverless (opcional)

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
- MercadoPago ready

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
- ✅ **Build Status:** 12.5s, 13 rotas, 0 TS errors

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

### **FUTURO (Após MVP)**
- [ ] **Fase 9** - Notificações & Reminders (email, SMS)
- [ ] **Fase 10** - MercadoPago integração completa
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

## 🎯 Resumo Executivo - Status do Projeto

### **O que está sólido ✅**
- Arquitetura TypeScript com tipos rigorosamente enforçados
- Modelo de dados Firestore bem estruturado
- CRUD funcional para todas as entidades principais
- Autenticação Firebase integrada
- Dashboard com análises e gráficos
- Agendamento público com step-by-step wizard
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
- Error Boundaries + tratamento de erros (5-7h)
- Monitoramento (Sentry/Crashlytics) (6-8h)
- MercadoPago integração completa (6-8h)
- reCAPTCHA no booking público (2h)

**VALOR ALTO (Semanas 5-6)** - Evolução de produto
- Integração WhatsApp Business (6-8h)
- Sistema de avaliações (4-5h)
- Export PDF/CSV (4-5h)

### **Gaps Identificados pela Análise Externa**
1. ❌ Nenhum teste automatizado → Risco em app financeiro
2. ❌ MercadoPago "ready" mas não funciona → Confunde usuários
3. ❌ Sem error handling visível → Erros silenciosos
4. ❌ Sem observabilidade → Impossível debugar em produção

### **Próximo Passo Recomendado**
Implementar as 4 CRÍTICAS de produção (16-18h de trabalho = ~2 semanas), depois adicionar os 3 IMPORTANTES de qualidade (testing + errors + monitoring) antes de publicidade/marketing.

---

**Última atualização:** Março 4, 2026 (v2 - Feedback do analista integrado)  
**Status:** ✅ Sólido com roadmap realista (não é "production ready" até CRÍTICAS + IMPORTANTES)  
**Build:** ✅ Passing (13 rotas, 0 TS errors, 12.5s)  
**Recomendação de Deploy:** Após implementar 4 CRÍTICAS mínimo  
**Commits recentes:** 
- "CRÍTICO: Padronizar todos os dates para SEMPRE usar Timestamp"
- "UI: Melhorar contraste de campos de entrada com bordas visíveis e texto preto forte"
- "Fix: Aplicar cor do texto APENAS em campos de entrada"
