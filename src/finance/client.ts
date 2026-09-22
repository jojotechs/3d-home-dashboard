import {isAccessError} from '../auth/client';

export interface FinanceEntry {
  id: string;
  kind: 'balance' | 'debt';
  name: string;
  amount_minor: string;
  version: string;
  created_by: string;
  updated_by: string;
  creator_name: string;
  editor_name: string;
  created_at: string;
  updated_at: string;
}
export interface FinanceSnapshot {
  household_id: string;
  household_name: string;
  version: string;
  net_savings_minor: string;
  saved_at: string | null;
  entries: FinanceEntry[];
}
export interface FinanceChange {
  id: string;
  operation: 'upsert' | 'remove';
  expected_version: string;
  kind?: 'balance' | 'debt';
  name?: string;
  amount_minor?: string;
}
export interface FinanceDraftRow {
  id: string;
  kind: 'balance' | 'debt';
  name: string;
  amount: string;
  removed: boolean;
  base: FinanceEntry | null;
  missing?: boolean;
  needsReview?: boolean;
}
export interface FinanceRequest {
  p_household_id: string;
  p_changes: FinanceChange[];
  p_request_id: string;
}

export function financeError(error: unknown): string {
  const code = (error as {code?: string})?.code;
  if (isAccessError(error)) return '登录已失效或没有财务访问权限，请重新登录或联系家庭管理员。';
  if (code === 'PT409') return '云端记录已变更。输入已保留，请先读取最新记录并核对，再保存。';
  if (code === '22023' || code === '22003') return '金额或名称格式不正确，请检查后重试。';
  return '未收到云端确认，输入已保留。请检查连接后重试。';
}

export interface FinanceHistoryEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  saved_at: string;
  version: string;
  snapshot: FinanceSnapshot;
}

export interface FinanceBook {
  current: FinanceSnapshot;
  history: FinanceHistoryEntry[];
}
