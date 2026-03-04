'use client';

import { useState, useEffect } from 'react';
import { onCollectionChange, onDocumentChange } from '../firestoreService';
import { collection, onSnapshot, query, orderBy, DocumentData, QuerySnapshot, WhereFilterOp, Query, CollectionReference } from 'firebase/firestore';
import { db } from '../firebase';
import type { DocumentSnapshot } from 'firebase/firestore';

export const useDocument = <T>(
  collectionName: string,
  documentId: string
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onDocumentChange(
      collectionName,
      documentId,
      (doc: DocumentSnapshot<DocumentData>) => {
        if (doc.exists()) {
          setData({ id: doc.id, ...doc.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, documentId]);

  return { data, loading, error };
};

export const useCollection = <T>(
  collectionName: string,
  conditions?: Array<{ field: string; operator: WhereFilterOp; value: unknown }>,
  orderByField?: string,
  orderDirection?: 'asc' | 'desc'
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onCollectionChange(
      collectionName,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const documents: T[] = [];
        snapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(documents);
        setLoading(false);
      },
      conditions,
      orderByField,
      orderDirection
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, JSON.stringify(conditions), orderByField, orderDirection]);

  return { data, loading, error };
};

export const useSubCollection = <T>(
  parentCollection: string,
  parentId: string | undefined,
  subCollectionName: string,
  orderByField?: string,
  orderDirection?: 'asc' | 'desc'
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!parentId) {
      setLoading(false);
      return;
    }

    const colRef = collection(db, parentCollection, parentId, subCollectionName);
    let q: Query<DocumentData> | CollectionReference<DocumentData> = colRef;

    if (orderByField) {
      q = query(colRef, orderBy(orderByField, orderDirection || 'asc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const documents: T[] = [];
      snapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() } as T);
      });
      setData(documents);
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [parentCollection, parentId, subCollectionName, orderByField, orderDirection]);

  return { data, loading, error };
}; 