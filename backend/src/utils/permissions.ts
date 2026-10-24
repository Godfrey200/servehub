export type Role = 'SystemAdmin' | 'CaseWorker' | 'VolunteerCoordinator' | 'Auditor';

export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  organizationId: string;
}

/**
 * Extract verified identity from API Gateway JWT authorizer context.
 * Never trust client headers for identity.
 */
export function getAuthContext(event: any): AuthContext | null {
  const jwt = event.requestContext?.authorizer?.jwt?.claims;
  if (!jwt) return null;

  const role = (jwt['custom:role'] || 'Auditor') as Role;
  const organizationId = jwt['custom:organizationId'] || '';
  const email = jwt.email || '';
  const userId = jwt.sub || '';

  if (!organizationId || !email) {
    return null;
  }

  return {
    userId,
    email,
    role,
    organizationId,
  };
}

export function canCreateCase(role: string): boolean {
  return role === 'SystemAdmin' || role === 'CaseWorker';
}

export function canEditCaseStatus(role: string): boolean {
  return role === 'SystemAdmin' || role === 'CaseWorker';
}

export function canCreateDonation(role: string): boolean {
  return role === 'SystemAdmin' || role === 'CaseWorker';
}

export function canEditDonationStatus(role: string): boolean {
  return role === 'SystemAdmin' || role === 'CaseWorker';
}

export function canManageUsers(role: string): boolean {
  return role === 'SystemAdmin';
}

export function canViewAudit(role: string): boolean {
  return role === 'SystemAdmin' || role === 'Auditor';
}
