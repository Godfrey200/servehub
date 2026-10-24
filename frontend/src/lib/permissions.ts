export type Role = 'SystemAdmin' | 'CaseWorker' | 'VolunteerCoordinator' | 'Auditor';

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
