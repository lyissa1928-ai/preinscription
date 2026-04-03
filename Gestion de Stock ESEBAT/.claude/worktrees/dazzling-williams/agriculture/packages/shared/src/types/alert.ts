import type { AlertType, AlertSeverity, AlertStatus } from '../enums';

export interface AlertRuleCondition {
  metric: string;
  operator: '<' | '>' | '<=' | '>=' | '==';
  value: number;
  days?: number;
}

export interface AlertDTO {
  id: string;
  farmerUserId: string;
  parcelId: string;
  parcelName?: string;
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  triggeredAt: string;
  ackedAt: string | null;
  resolvedAt: string | null;
  mutedUntil: string | null;
  meta: Record<string, unknown> | null;
}

export interface AlertSummaryDTO {
  open: number;
  critical: number;
  warning: number;
  lastTriggeredAt: string | null;
}
