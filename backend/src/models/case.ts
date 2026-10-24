export type CaseStatus = 'New' | 'Active' | 'Under Review' | 'Closed';

export interface CaseItem {
  PK: string;               // ORG#<organizationId>
  SK: string;               // CASE#<caseId>
  entityType: 'CASE';
  organizationId: string;
  caseId: string;
  beneficiaryName: string;
  contactPhone?: string;
  contactEmail?: string;
  status: CaseStatus;
  priority: 'Low' | 'Medium' | 'High';
  summary: string;
  notes?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  GSI1PK?: string;          // For querying by status
  GSI1SK?: string;
}
