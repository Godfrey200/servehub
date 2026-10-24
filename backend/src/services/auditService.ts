import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { AuditItem } from '../models/audit';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'servehub-main';

export async function writeAuditLog(params: {
  organizationId: string;
  action: string;
  entity: string;
  entityId?: string;
  performedBy: string;
  details?: string;
}): Promise<void> {
  const auditId = uuidv4();
  const now = new Date().toISOString();

  const item: AuditItem = {
    PK: `ORG#${params.organizationId}`,
    SK: `AUDIT#${now}#${auditId}`,
    entityType: 'AUDIT',
    organizationId: params.organizationId,
    auditId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    performedBy: params.performedBy,
    details: params.details,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

export async function listAuditLogs(organizationId: string): Promise<AuditItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ORG#${organizationId}`,
        ':sk': 'AUDIT#',
      },
      ScanIndexForward: false, // newest first
      Limit: 100,
    })
  );

  return (result.Items as AuditItem[]) || [];
}
