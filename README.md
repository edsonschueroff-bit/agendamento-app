# Agendamento App

Uma aplicação moderna de gestão de agenda pessoal e de equipe construída com Next.js 14, TypeScript e Firebase.

## 🚀 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Firebase** - Backend como serviço (Auth + Firestore)
- **Tailwind CSS** - Framework CSS utilitário
- **Yarn** - Gerenciador de pacotes

## 📋 Pré-requisitos

- Node.js 18+ 
- Yarn
- Conta no Firebase

## 🔧 Configuração

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd agendamento-app
```

### 2. Instale as dependências
```bash
yarn install
```

### 3. Configure o Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Crie um novo projeto ou use um existente
3. Ative a **Authentication** com email/senha
4. Ative o **Firestore Database**
5. Vá em **Configurações do Projeto** > **Configurações do SDK**
6. Copie as credenciais de configuração

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id

# App Configuration
NEXT_PUBLIC_APP_NAME=Agendamento App
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 5. Execute o projeto
```bash
yarn dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 🏗️ Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js 14)
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Página inicial
│   └── globals.css        # Estilos globais
├── components/            # Componentes React
│   └── providers/         # Providers de contexto
├── lib/                   # Bibliotecas e utilitários
│   ├── firebase.ts        # Configuração do Firebase
│   ├── authService.ts     # Serviços de autenticação
│   ├── firestoreService.ts # Serviços do Firestore
│   ├── types.ts           # Tipos TypeScript
│   └── hooks/             # Hooks personalizados
└── ...
```

## 🔥 Funcionalidades do Firebase

### Autenticação
- ✅ Login com email/senha
- ✅ Registro de usuários
- ✅ Logout
- ✅ Observação de estado de autenticação
- ✅ Contexto de autenticação

### Firestore
- ✅ CRUD completo de documentos
- ✅ Subcoleções
- ✅ Consultas com filtros
- ✅ Ordenação e paginação
- ✅ Observação em tempo real
- ✅ Operações em lote

### Hooks Personalizados
- ✅ `useAuth()` - Gerenciamento de autenticação
- ✅ `useDocument()` - Observação de documento
- ✅ `useCollection()` - Observação de coleção

## 📚 Como Usar

### Autenticação
```typescript
import { useAuthContext } from '@/components/providers/AuthProvider';
import { loginUser, registerUser, logoutUser } from '@/lib/authService';

// No seu componente
const { user, loading, isAuthenticated } = useAuthContext();

// Login
await loginUser('email@example.com', 'senha123');

// Registro
await registerUser('email@example.com', 'senha123');

// Logout
await logoutUser();
```

### Firestore
```typescript
import { 
  addDocument, 
  getDocuments, 
  updateDocument, 
  deleteDocument 
} from '@/lib/firestoreService';

// Adicionar documento
const id = await addDocument('appointments', {
  title: 'Reunião',
  startDate: new Date(),
  userId: 'user123'
});

// Buscar documentos
const appointments = await getDocuments('appointments', [
  { field: 'userId', operator: '==', value: 'user123' }
], 'startDate', 'asc');

// Atualizar documento
await updateDocument('appointments', 'docId', {
  title: 'Reunião Atualizada'
});

// Deletar documento
await deleteDocument('appointments', 'docId');
```

### Hooks do Firestore
```typescript
import { useDocument, useCollection } from '@/lib/hooks/useFirestore';

// Observar documento
const { data: appointment, loading } = useDocument<Appointment>(
  'appointments', 
  'docId'
);

// Observar coleção
const { data: appointments, loading } = useCollection<Appointment>(
  'appointments',
  [{ field: 'userId', operator: '==', value: 'user123' }],
  'startDate',
  'asc'
);
```

## 🔒 Segurança

- Todas as credenciais do Firebase são armazenadas em variáveis de ambiente
- Prefixo `NEXT_PUBLIC_` para variáveis acessíveis no cliente
- Configuração de regras de segurança no Firestore recomendada

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente no painel do Vercel
3. Deploy automático a cada push

### Outras plataformas
- Configure as variáveis de ambiente
- Build: `yarn build`
- Start: `yarn start`

## 📝 Licença

MIT

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.
