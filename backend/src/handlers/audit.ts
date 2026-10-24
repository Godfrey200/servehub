import { listAuditLogs } from '../services/auditService';
import { getAuthContext, canViewAudit } from '../utils/permissions';

function response(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event: any) {
  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path || '';

  const auth = getAuthContext(event);
  if (!auth) {
    return response(401, { message: 'Unauthorized' });
  }

  const { organizationId, role } = auth;

  try {
    if (!canViewAudit(role)) {
      return response(403, { message: 'You do not have permission to view audit logs' });
    }

    if (method === 'GET' && (path === '/audit' || path.endsWith('/audit'))) {
      const logs = await listAuditLogs(organizationId);
      return response(200, { logs });
    }

    return response(404, { message: 'Route not found' });
  } catch (error: any) {
    console.error(error);
    return response(500, { message: 'Internal server error', detail: error.message });
  }
}
