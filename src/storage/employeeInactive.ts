/**
 * Admin deactivated the employee — revoke local session material immediately.
 * Does NOT persist a permanent "inactive forever" flag; backend is source of truth.
 */
import { EMPLOYEE_INACTIVE_MESSAGE } from "../constants/employeeInactive";

type TeardownHandler = () => void | Promise<void>;

const teardownHandlers = new Set<TeardownHandler>();
let handlingInactive = false;
let authTeardownEpoch = 0;

/** Bump to cancel deferred session-expired teardowns (e.g. before password login). */
export function bumpAuthTeardownEpoch(): number {
  authTeardownEpoch += 1;
  return authTeardownEpoch;
}

export function getAuthTeardownEpoch(): number {
  return authTeardownEpoch;
}

export function registerEmployeeInactiveTeardown(handler: TeardownHandler) {
  teardownHandlers.add(handler);
  return () => {
    teardownHandlers.delete(handler);
  };
}

async function runTeardownHandlers() {
  if (handlingInactive) return;
  handlingInactive = true;
  try {
    for (const handler of teardownHandlers) {
      try {
        await handler();
      } catch {
        /* best-effort */
      }
    }
  } finally {
    handlingInactive = false;
  }
}

/**
 * Immediate inactive teardown. Cancels pending session-expired logout so a later
 * reactivation password login cannot be wiped by a deferred timer.
 */
export async function handleEmployeeInactive(): Promise<void> {
  bumpAuthTeardownEpoch();
  await runTeardownHandlers();
}

export { EMPLOYEE_INACTIVE_MESSAGE };
