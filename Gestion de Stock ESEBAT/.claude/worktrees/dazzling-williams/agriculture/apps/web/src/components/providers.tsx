'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { TokenRefreshProvider } from './TokenRefreshProvider';
import { SessionTimeoutProvider } from './SessionTimeoutProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TokenRefreshProvider>
        <SessionTimeoutProvider>{children}</SessionTimeoutProvider>
      </TokenRefreshProvider>
    </QueryClientProvider>
  );
}
