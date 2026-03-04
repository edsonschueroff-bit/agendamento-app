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
│       │   ├── avatar: string (URL)
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

---

## 🚀 Próximas Fases (Futuro)

- [ ] **Fase 9** - Notificações & Reminders (email, SMS)
- [ ] **Fase 10** - MercadoPago integração completa
- [ ] **Fase 11** - Relatórios exportáveis (PDF, CSV)
- [ ] **Fase 12** - App mobile (React Native)
- [ ] **Fase 13** - PWA + offline mode
- [ ] **Fase 14** - Backup automático
- [ ] **Fase 15** - Multi-profissional (equipe)

---

## 📞 Suporte e Documentação

- **Firebase Docs:** https://firebase.google.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Firestore Structure:** Ver seção "Arquitetura do Banco de Dados"
- **Tipos TypeScript:** `src/lib/types.ts`
- **Serviços:** `src/lib/firestoreService.ts`

---

**Última atualização:** Março 4, 2026  
**Status:** ✅ Production Ready  
**Build:** ✅ Passing (13 rotas, 0 errors)
