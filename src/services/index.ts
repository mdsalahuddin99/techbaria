// ─── Next.js API client ─────────────────────────────────────────────────────
// Feature hooks import from @/services. This barrel now re-exports the
// fetch-based API client wrappers that talk to app/api/* Route Handlers.
// The old Zustand+Supabase files remain in src/services/ as dead code
// ready for deletion once the migration is complete.
//
// All services now route through app/api/*. The barrel provides a
// backwards-compatible import so existing feature hooks work unchanged.
export {
  productsService,
  customersService,
  salesService,
  suppliersService,
  expensesService,
  shiftsService,
  inventoryService,
  purchasesService,
  notificationsService,
  transfersService,
  accountsService,
} from "@/shared/api-client";

// auditService — stock-count audit operations
export { auditService } from "@/shared/api-client/audit";
// auditLogService — system audit log (AuditLog model)
export { auditLogService } from "@/shared/api-client/audit-log";
export { authService } from "@/shared/api-client/auth";
export { settingsService } from "@/shared/api-client";
