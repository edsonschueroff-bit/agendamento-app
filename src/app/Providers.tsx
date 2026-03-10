'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from "@/components/providers/AuthProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
