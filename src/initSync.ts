import { useStore } from './store';
import { isServerSyncEnabled, pushSnapshot } from './lib/api';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function buildPayload(state: ReturnType<typeof useStore.getState>) {
  return {
    appSettings: state.appSettings,
    customers: state.customers,
    policies: state.policies,
    documents: state.documents,
    claims: state.claims,
    leads: state.leads,
    notifications: state.notifications,
    knowledgeArticles: state.knowledgeArticles,
    commissions: state.commissions,
    renewals: state.renewals,
    auditLogs: state.auditLogs,
    familyMembers: state.familyMembers,
    endorsements: state.endorsements,
    complianceReports: state.complianceReports,
    // Strip passwords before persisting to server (matches syncToServer in store.ts)
    employees: state.employees.map(e => ({
      ...e,
      password: undefined,
    })),
  };
}

export function initServerSync() {
  if (!isServerSyncEnabled()) return;

  useStore.subscribe((state) => {
    if (!state.isAuthenticated || !state.tenant?.id) return;
    if (!state.syncFromServerComplete) return;

    const tenantId = state.tenant.id;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      pushSnapshot(tenantId, buildPayload(state)).catch((error) => {
        console.error('Server sync failed:', error);
        // Consider: retry logic, user notification, or queuing for later
      });
    }, 2500);
  });
}
