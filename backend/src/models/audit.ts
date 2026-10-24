export interface AuditItem {
  PK: string;                 // ORG#<organizationId>
  SK: string;                 // AUDIT#<timestamp>#<id>
  entityType: 'AUDIT';
  organizationId: string;
  auditId: string;
  action: string;
  entity: string;
  entityId?: string;
  performedBy: string;
  details?: string;
  createdAt: string;
}
