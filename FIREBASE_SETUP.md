# 🔥 Guia de Configuração do Firebase

## Passo a Passo para Configurar o Firebase

### 1. Criar Projeto no Firebase

1. Acesse [Console do Firebase](https://console.firebase.google.com/)
2. Clique em **"Criar um projeto"**
3. Digite o nome do projeto (ex: "agendamento-app")
4. Clique em **"Continuar"**
5. Desative o Google Analytics (opcional)
6. Clique em **"Criar projeto"**

### 2. Ativar Authentication

1. No menu lateral, clique em **"Authentication"**
2. Clique em **"Começar"**
3. Vá para a aba **"Sign-in method"**
4. Clique em **"Email/Senha"**
5. Ative a opção **"Email/Senha"**
6. Clique em **"Salvar"**

### 3. Ativar Firestore Database

1. No menu lateral, clique em **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Iniciar no modo de teste"** (para desenvolvimento)
4. Escolha a localização mais próxima (ex: "us-central1")
5. Clique em **"Pronto"**

### 4. Obter Credenciais

1. No menu lateral, clique na **engrenagem** (⚙️) ao lado de "Visão geral do projeto"
2. Clique em **"Configurações do projeto"**
3. Vá para a aba **"Geral"**
4. Role para baixo até **"Seus aplicativos"**
5. Clique no ícone **"Web"** (</>)
6. Digite um nome para o app (ex: "agendamento-app-web")
7. Clique em **"Registrar app"**
8. Copie as credenciais que aparecem

### 5. Configurar Variáveis de Ambiente

1. Na raiz do projeto, crie um arquivo chamado `.env.local`
2. Adicione o seguinte conteúdo (substitua pelas suas credenciais):

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id

# App Configuration
NEXT_PUBLIC_APP_NAME=Agendamento App
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 6. Exemplo de Credenciais

Suas credenciais devem se parecer com isso:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz",
  authDomain: "meu-projeto-12345.firebaseapp.com",
  projectId: "meu-projeto-12345",
  storageBucket: "meu-projeto-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

### 7. Reiniciar o Servidor

```bash
# Pare o servidor (Ctrl+C) e reinicie
yarn dev
```

### 8. Testar a Configuração

1. Acesse `http://localhost:3000`
2. Você deve ver "✅ Configurado" no status
3. Teste os botões de login/registro

## 🔒 Configuração de Segurança (Opcional)

### Regras do Firestore

No console do Firebase, vá em **Firestore Database** → **Regras** e configure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso apenas para usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Regras de Authentication

No console do Firebase, vá em **Authentication** → **Settings** → **Authorized domains** e adicione:
- `localhost` (para desenvolvimento)
- Seu domínio de produção

## 🚨 Solução de Problemas

### Erro "auth/invalid-api-key"
- Verifique se as credenciais estão corretas no `.env.local`
- Certifique-se de que o arquivo `.env.local` está na raiz do projeto
- Reinicie o servidor após criar o arquivo

### Erro "auth/operation-not-allowed"
- Verifique se o Authentication está ativado no Firebase
- Confirme se o método "Email/Senha" está habilitado

### Erro "permission-denied"
- Verifique as regras do Firestore
- Certifique-se de que o usuário está autenticado

## 📞 Suporte

Se ainda tiver problemas:
1. Verifique o console do navegador para erros
2. Confirme se todas as etapas foram seguidas
3. Verifique se o projeto do Firebase está ativo 