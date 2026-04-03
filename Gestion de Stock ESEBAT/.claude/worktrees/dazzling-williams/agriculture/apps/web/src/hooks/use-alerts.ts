'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { farmerApi } from '@/lib/api';

const ALERTS_KEY = ['farmer-alerts'];
const ALERT_SUMMARY_KEY = ['farmer-alerts-summary'];

export function useAlerts(params?: { page?: number; limit?: number; status?: string; severity?: string }) {
  return useQuery({
    queryKey: [...ALERTS_KEY, params?.page ?? 1, params?.limit ?? 10, params?.status, params?.severity],
    queryFn: () => farmerApi.getAlerts(params),
  });
}

export function useAlertSummary() {
  return useQuery({
    queryKey: ALERT_SUMMARY_KEY,
    queryFn: () => farmerApi.getAlertSummary(),
  });
}

export function useAlert(id: string | null) {
  return useQuery({
    queryKey: [...ALERTS_KEY, id],
    queryFn: () => farmerApi.getAlert(id!),
    enabled: !!id,
  });
}

function invalidateAlerts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ALERTS_KEY });
  queryClient.invalidateQueries({ queryKey: ALERT_SUMMARY_KEY });
}

export function useAckAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => farmerApi.ackAlert(id),
    onSuccess: () => invalidateAlerts(queryClient),
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => farmerApi.resolveAlert(id),
    onSuccess: () => invalidateAlerts(queryClient),
  });
}

export function useMuteAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) => farmerApi.muteAlert(id, hours),
    onSuccess: () => invalidateAlerts(queryClient),
  });
}
