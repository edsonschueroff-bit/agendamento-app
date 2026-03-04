import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp,
  WhereFilterOp,
  Query,
  CollectionReference,
} from 'firebase/firestore';
import { db } from './firebase';

// Tipos básicos
export interface FirestoreDocument {
  id?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Função para adicionar um documento
export const addDocument = async <T extends FirestoreDocument>(
  collectionName: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, collectionName), docData);
    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar documento:', error);
    throw error;
  }
};

// Função para obter um documento por ID
export const getDocument = async <T extends FirestoreDocument>(
  collectionName: string,
  documentId: string
): Promise<T | null> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro ao obter documento:', error);
    throw error;
  }
};

// Função para obter todos os documentos de uma coleção
export const getDocuments = async <T extends FirestoreDocument>(
  collectionName: string,
  conditions?: Array<{ field: string; operator: WhereFilterOp; value: unknown }>,
  orderByField?: string,
  orderDirection?: 'asc' | 'desc',
  limitCount?: number
): Promise<T[]> => {
  try {
    let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, collectionName);

    // Aplicar condições de filtro
    if (conditions && conditions.length > 0) {
      const whereConditions = conditions.map(condition =>
        where(condition.field, condition.operator, condition.value)
      );
      q = query(q, ...whereConditions);
    }

    // Aplicar ordenação
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderDirection || 'asc'));
    }

    // Aplicar limite
    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const querySnapshot = await getDocs(q);
    const documents: T[] = [];

    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() } as T);
    });

    return documents;
  } catch (error) {
    console.error('Erro ao obter documentos:', error);
    throw error;
  }
};

// Função para atualizar um documento
export const updateDocument = async <T extends FirestoreDocument>(
  collectionName: string,
  documentId: string,
  data: Partial<Omit<T, 'id' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    throw error;
  }
};

// Função para atualizar um documento em subcoleção
export const updateSubDocument = async <T extends FirestoreDocument>(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  documentId: string,
  data: Partial<Omit<T, 'id' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = doc(db, parentCollection, parentId, subCollection, documentId);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Erro ao atualizar subdocumento:', error);
    throw error;
  }
};

// Função para deletar um documento
export const deleteDocument = async (
  collectionName: string,
  documentId: string
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    throw error;
  }
};

// Função para deletar um documento em subcoleção
export const deleteSubDocument = async (
  parentCollection: string,
  parentId: string,
  subCollection: string,
  documentId: string
): Promise<void> => {
  try {
    const docRef = doc(db, parentCollection, parentId, subCollection, documentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Erro ao deletar subdocumento:', error);
    throw error;
  }
};

// Função para adicionar documento em subcoleção
export const addSubDocument = async <T extends FirestoreDocument>(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const subCollectionRef = collection(db, parentCollection, parentId, subCollection);
    const docRef = await addDoc(subCollectionRef, docData);
    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar subdocumento:', error);
    throw error;
  }
};

// Função para obter documentos de uma subcoleção
export const getSubDocuments = async <T extends FirestoreDocument>(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  conditions?: Array<{ field: string; operator: WhereFilterOp; value: unknown }>,
  orderByField?: string,
  orderDirection?: 'asc' | 'desc'
): Promise<T[]> => {
  try {
    let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, parentCollection, parentId, subCollection);

    // Aplicar condições de filtro
    if (conditions && conditions.length > 0) {
      const whereConditions = conditions.map(condition =>
        where(condition.field, condition.operator, condition.value)
      );
      q = query(q, ...whereConditions);
    }

    // Aplicar ordenação
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderDirection || 'asc'));
    }

    const querySnapshot = await getDocs(q);
    const documents: T[] = [];

    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() } as T);
    });

    return documents;
  } catch (error) {
    console.error('Erro ao obter subdocumentos:', error);
    throw error;
  }
};

// Função para observar mudanças em tempo real
export const onDocumentChange = (
  collectionName: string,
  documentId: string,
  callback: (doc: DocumentSnapshot<DocumentData>) => void
): (() => void) => {
  const docRef = doc(db, collectionName, documentId);
  return onSnapshot(docRef, callback);
};

// Função para observar mudanças em uma coleção em tempo real
export const onCollectionChange = (
  collectionName: string,
  callback: (snapshot: QuerySnapshot<DocumentData>) => void,
  conditions?: Array<{ field: string; operator: WhereFilterOp; value: unknown }>,
  orderByField?: string,
  orderDirection?: 'asc' | 'desc'
): (() => void) => {
  let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, collectionName);

  if (conditions && conditions.length > 0) {
    const whereConditions = conditions.map(condition =>
      where(condition.field, condition.operator, condition.value)
    );
    q = query(q, ...whereConditions);
  }

  if (orderByField) {
    q = query(q, orderBy(orderByField, orderDirection || 'asc'));
  }

  return onSnapshot(q, callback);
};

// Função para operações em lote
export const batchOperation = async (
  operations: Array<{
    type: 'add' | 'update' | 'delete';
    collection: string;
    id?: string;
    data?: Record<string, unknown>;
  }>
): Promise<void> => {
  try {
    const batch = writeBatch(db);

    operations.forEach((operation) => {
      switch (operation.type) {
        case 'add':
          if (operation.data) {
            const docRef = doc(collection(db, operation.collection));
            batch.set(docRef, {
              ...operation.data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          break;
        case 'update':
          if (operation.id && operation.data) {
            const docRef = doc(db, operation.collection, operation.id);
            batch.update(docRef, {
              ...operation.data,
              updatedAt: serverTimestamp(),
            });
          }
          break;
        case 'delete':
          if (operation.id) {
            const docRef = doc(db, operation.collection, operation.id);
            batch.delete(docRef);
          }
          break;
      }
    });

    await batch.commit();
  } catch (error) {
    console.error('Erro na operação em lote:', error);
    throw error;
  }
};

export { db };

// Função para obter um documento específico de uma subcoleção (por ID fixo como 'business')
export const getSubDocument = async <T extends FirestoreDocument>(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  documentId: string
): Promise<T | null> => {
  try {
    const docRef = doc(db, parentCollection, parentId, subCollection, documentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error('Erro ao obter subdocumento:', error);
    throw error;
  }
};

// Função para criar/substituir (set) um documento em subcoleção com ID fixo
export const setSubDocument = async <T extends FirestoreDocument>(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  documentId: string,
  data: Omit<T, 'id'>
): Promise<void> => {
  try {
    const docRef = doc(db, parentCollection, parentId, subCollection, documentId);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() }).catch(async () => {
      // Se o documento não existe, cria com set
      const { setDoc } = await import('firebase/firestore');
      await setDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    });
  } catch (error) {
    console.error('Erro ao salvar subdocumento:', error);
    throw error;
  }
};

// Nova função para criar consultas
export const createQuery = (collectionName: string, whereConditions: ReturnType<typeof where>[], orderByField?: string, orderDirection?: 'asc' | 'desc', limitCount?: number) => {
  let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, collectionName);

  if (whereConditions.length) {
    q = query(q, ...whereConditions);
  }

  if (orderByField) {
    q = query(q, orderBy(orderByField, orderDirection || 'asc'));
  }

  if (limitCount) {
    q = query(q, limit(limitCount));
  }

  return q;
};