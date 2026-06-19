import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auditService } from "@/services";
import { useAuth } from "@/features/auth";

const auditKeys = {
  all: ["audits"] as const,
  byId: (id: string) => ["audits", id] as const,
};

export const useAudits = () => {
  const { session, status } = useAuth();
  const { data = [] } = useQuery({
    queryKey: auditKeys.all,
    queryFn: auditService.list,
    enabled: status !== "loading" && !!session,
  });
  return data;
};

export function useAudit(id: string | null) {
  const audits = useAudits();
  return useMemo(() => audits.find((a) => a.id === id) ?? null, [audits, id]);
}

export function useAuditActions() {
  const qc = useQueryClient();
  return {
    create: (input: Parameters<typeof auditService.create>[0]) =>
      auditService.create(input).then((r) => { qc.invalidateQueries({ queryKey: auditKeys.all }); return r; }),
    setCount: (auditId: string, productId: string, countedQty: number | null, note?: string) =>
      auditService.setCount(auditId, productId, countedQty, note).then(() => { qc.invalidateQueries({ queryKey: auditKeys.all }); }),
    complete: (auditId: string) =>
      auditService.complete(auditId).then((r) => { qc.invalidateQueries({ queryKey: auditKeys.all }); return r; }),
    cancel: (auditId: string) =>
      auditService.cancel(auditId).then(() => { qc.invalidateQueries({ queryKey: auditKeys.all }); }),
    remove: (auditId: string) =>
      auditService.remove(auditId).then(() => { qc.invalidateQueries({ queryKey: auditKeys.all }); }),
  };
}

export function summarizeAudit(lines: { systemQty: number; countedQty: number | null; costPrice: number }[]) {
  let counted = 0;
  let pending = 0;
  let varianceQty = 0;
  let varianceValue = 0;
  let positive = 0;
  let negative = 0;
  lines.forEach((l) => {
    if (l.countedQty == null) {
      pending += 1;
      return;
    }
    counted += 1;
    const diff = l.countedQty - l.systemQty;
    varianceQty += diff;
    varianceValue += diff * l.costPrice;
    if (diff > 0) positive += 1;
    else if (diff < 0) negative += 1;
  });
  return { counted, pending, varianceQty, varianceValue, positive, negative };
}
