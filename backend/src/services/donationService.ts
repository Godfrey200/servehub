import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { DonationItem, DonationStatus, DonationType } from '../models/donation';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'servehub-main';

export async function createDonation(params: {
  organizationId: string;
  donorName: string;
  type: DonationType;
  amount?: number;
  description: string;
  linkedCaseId?: string;
  createdBy: string;
}): Promise<DonationItem> {
  const donationId = uuidv4();
  const now = new Date().toISOString();

  const item: DonationItem = {
    PK: `ORG#${params.organizationId}`,
    SK: `DONATION#${donationId}`,
    entityType: 'DONATION',
    organizationId: params.organizationId,
    donationId,
    donorName: params.donorName,
    type: params.type,
    amount: params.amount,
    description: params.description,
    status: 'Received',
    linkedCaseId: params.linkedCaseId,
    receivedAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: params.createdBy,
    GSI1PK: `ORG#${params.organizationId}#DONATION`,
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

export async function listDonations(organizationId: string): Promise<DonationItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ORG#${organizationId}`,
        ':sk': 'DONATION#',
      },
    })
  );

  return (result.Items as DonationItem[]) || [];
}

export async function updateDonationStatus(
  organizationId: string,
  donationId: string,
  status: DonationStatus
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ORG#${organizationId}`,
        SK: `DONATION#${donationId}`,
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': now,
      },
    })
  );
}
