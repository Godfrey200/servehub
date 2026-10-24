import { createCase, listCases, getCase, updateCaseStatus } from '../services/caseService';
import { writeAuditLog } from '../services/auditService';
import { CaseStatus } from '../models/case';
import {
  getAuthContext,
  canCreateCase,
  canEditCaseStatus,
} from '../utils/permissions';

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
  const pathParameters = event.pathParameters || {};

  const auth = getAuthContext(event);
  if (!auth) {
    return response(401, { message: 'Unauthorized' });
  }

  const { organizationId, email, role } = auth;

  try {
    if (method === 'GET' && (path === '/cases' || path.endsWith('/cases'))) {
      const cases = await listCases(organizationId);
      return response(200, { cases });
    }

    if (method === 'GET' && pathParameters.caseId) {
      const caseItem = await getCase(organizationId, pathParameters.caseId);
      if (!caseItem) {
        return response(404, { message: 'Case not found' });
      }
      return response(200, { case: caseItem });
    }

    if (method === 'POST' && (path === '/cases' || path.endsWith('/cases'))) {
      if (!canCreateCase(role)) {
        return response(403, { message: 'You do not have permission to create cases' });
      }

      const body =
        typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};

      if (!body.beneficiaryName || !body.summary) {
        return response(400, { message: 'beneficiaryName and summary are required' });
      }

      const newCase = await createCase({
        organizationId,
        beneficiaryName: body.beneficiaryName,
        contactPhone: body.contactPhone,
        contactEmail: body.contactEmail,
        priority: body.priority || 'Medium',
        summary: body.summary,
        notes: body.notes,
        createdBy: email,
      });

      await writeAuditLog({
        organizationId,
        action: 'CREATE',
        entity: 'CASE',
        entityId: newCase.caseId,
        performedBy: email,
        details: `Created case for ${body.beneficiaryName}`,
      });

      return response(201, { case: newCase });
    }

    if (method === 'PATCH' && pathParameters.caseId) {
      if (!canEditCaseStatus(role)) {
        return response(403, { message: 'You do not have permission to update case status' });
      }

      const body =
        typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};

      const allowedStatuses: CaseStatus[] = ['New', 'Active', 'Under Review', 'Closed'];
      if (!body.status || !allowedStatuses.includes(body.status)) {
        return response(400, { message: 'Valid status is required' });
      }

      await updateCaseStatus(organizationId, pathParameters.caseId, body.status, email);

      await writeAuditLog({
        organizationId,
        action: 'UPDATE_STATUS',
        entity: 'CASE',
        entityId: pathParameters.caseId,
        performedBy: email,
        details: `Changed status to ${body.status}`,
      });

      return response(200, { message: 'Status updated' });
    }

    return response(404, { message: 'Route not found' });
  } catch (error: any) {
    console.error(error);
    return response(500, { message: 'Internal server error', detail: error.message });
  }
}
