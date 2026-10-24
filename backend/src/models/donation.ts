export type DonationType = 'Financial' | 'In-Kind';
export type DonationStatus = 'Received' | 'Allocated' | 'Used';

export interface DonationItem {
  PK: string;                 // ORG#<organizationId>
  SK: string;                 // DONATION#<donationId>
  entityType: 'DONATION';
  organizationId: string;
  donationId: string;
  donorName: string;
  type: DonationType;
  amount?: number;            // for financial
  description: string;        // especially for in-kind
  status: DonationStatus;
  linkedCaseId?: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  GSI1PK?: string;
  GSI1SK?: string;
}
