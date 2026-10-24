import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { v4 as uuidv4 } from 'uuid';
import { UserItem, UserRole } from '../models/user';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-west-1',
});

const TABLE_NAME = process.env.TABLE_NAME || 'servehub-main';
const USER_POOL_ID = process.env.USER_POOL_ID || '';
const DEFAULT_TEMP_PASSWORD = 'ServeHub2026!';

export async function listUsers(organizationId: string): Promise<UserItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ORG#${organizationId}`,
        ':sk': 'USER#',
      },
    })
  );
  return (result.Items as UserItem[]) || [];
}

export async function getUser(
  organizationId: string,
  userId: string
): Promise<UserItem | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ORG#${organizationId}`,
        SK: `USER#${userId}`,
      },
    })
  );
  return (result.Item as UserItem) || null;
}

export async function createUser(params: {
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  createdBy: string;
}): Promise<UserItem> {
  if (!USER_POOL_ID) {
    throw new Error('USER_POOL_ID is not configured');
  }

  await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: params.email,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: params.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: params.name },
        { Name: 'custom:organizationId', Value: params.organizationId },
        { Name: 'custom:role', Value: params.role },
      ],
    })
  );

  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: params.email,
      Password: DEFAULT_TEMP_PASSWORD,
      Permanent: true,
    })
  );

  const userId = uuidv4();
  const now = new Date().toISOString();

  const item: UserItem = {
    PK: `ORG#${params.organizationId}`,
    SK: `USER#${userId}`,
    entityType: 'USER',
    organizationId: params.organizationId,
    userId,
    email: params.email,
    name: params.name,
    role: params.role,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return item;
}

export async function updateUser(params: {
  organizationId: string;
  userId: string;
  email: string;
  name?: string;
  role?: UserRole;
}): Promise<void> {
  if (!USER_POOL_ID) {
    throw new Error('USER_POOL_ID is not configured');
  }

  const now = new Date().toISOString();
  const attrs: { Name: string; Value: string }[] = [];

  if (params.name) {
    attrs.push({ Name: 'name', Value: params.name });
  }
  if (params.role) {
    attrs.push({ Name: 'custom:role', Value: params.role });
  }

  if (attrs.length > 0) {
    await cognitoClient.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: params.email,
        UserAttributes: attrs,
      })
    );
  }

  const expressionParts: string[] = ['updatedAt = :updatedAt'];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = { ':updatedAt': now };

  if (params.name) {
    expressionParts.push('#name = :name');
    names['#name'] = 'name';
    values[':name'] = params.name;
  }
  if (params.role) {
    expressionParts.push('#role = :role');
    names['#role'] = 'role';
    values[':role'] = params.role;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ORG#${params.organizationId}`,
        SK: `USER#${params.userId}`,
      },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: values,
    })
  );
}

export async function deleteUser(params: {
  organizationId: string;
  userId: string;
  email: string;
}): Promise<void> {
  if (!USER_POOL_ID) {
    throw new Error('USER_POOL_ID is not configured');
  }

  // Remove Cognito login
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: params.email,
      })
    );
  } catch (err: any) {
    // If already deleted in Cognito, continue removing DynamoDB record
    if (err.name !== 'UserNotFoundException') {
      throw err;
    }
  }

  // Remove directory profile
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ORG#${params.organizationId}`,
        SK: `USER#${params.userId}`,
      },
    })
  );
}

export async function setUserEnabled(email: string, enabled: boolean): Promise<void> {
  if (!USER_POOL_ID) {
    throw new Error('USER_POOL_ID is not configured');
  }

  if (enabled) {
    await cognitoClient.send(
      new AdminEnableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      })
    );
  } else {
    await cognitoClient.send(
      new AdminDisableUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      })
    );
  }
}
