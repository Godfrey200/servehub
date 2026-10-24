export type UserRole = 'SystemAdmin' | 'CaseWorker' | 'VolunteerCoordinator' | 'Auditor';

export interface UserItem {
  PK: string;                 // ORG#<organizationId>
  SK: string;                 // USER#<userId>
  entityType: 'USER';
  organizationId: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
