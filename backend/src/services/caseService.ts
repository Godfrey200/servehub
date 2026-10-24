import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CaseItem, CaseStatus } from '../models/case';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'servehub-main';

export async function createCase(params: {
  organizationId: string;
  beneficiaryName: string;
  contactPhone?: string;
  contactEmail?: string;
  priority: 'Low' | 'Medium' | 'High';
  summary: string;
  notes?: string;
  createdBy: string;
}): Promise<CaseItem> {
  const caseId = uuidv4();
  const now = new Date().toISOString();

  const item: CaseItem = {
    PK: `ORG#${params.organizationId}`,
    SK: `CASE#${caseId}`,
    entityType: 'CASE',
    organizationId: params.organizationId,
    caseId,
    beneficiaryName: params.beneficiaryName,
    contactPhone: params.contactPhone,
    contactEmail: params.contactEmail,
    status: 'New',
    priority: params.priority,
    summary: params.summary,
    notes: params.notes,
    createdAt: now,
    updatedAt: now,
    createdBy: params.createdBy,
    GSI1PK: `ORG#${params.organizationId}#STATUS#New`,
    GSI1SK: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return item;
}

export async function listCases(organizationId: string): Promise<CaseItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ORG#${organizationId}`,
        ':sk': 'CASE#',
      },
    })
  );

  return (result.Items as CaseItem[]) || [];
}

export async function getCase(organizationId: string, caseId: string): Promise<CaseItem | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ORG#${organizationId}`,
        SK: `CASE#${caseId}`,
      },
    })
  );

  return (result.Item as CaseItem) || null;
}

export async function updateCaseStatus(
  organizationId: string,
  caseId: string,
  status: CaseStatus,
  updatedBy: string
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ORG#${organizationId}`,
        SK: `CASE#${caseId}`,
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': now,
        ':gsi1pk': `ORG#${organizationId}#STATUS#${status}`,
        ':gsi1sk': now,
      },
    })
  );
}
