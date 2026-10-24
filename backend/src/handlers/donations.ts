import { createDonation, listDonations, updateDonationStatus } from '../services/donationService';
import { writeAuditLog } from '../services/auditService';
import { DonationStatus, DonationType } from '../models/donation';
import {
  getAuthContext,
  canCreateDonation,
  canEditDonationStatus,
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
    if (method === 'GET' && (path === '/donations' || path.endsWith('/donations'))) {
      const donations = await listDonations(organizationId);
      return response(200, { donations });
    }

    if (method === 'POST' && (path === '/donations' || path.endsWith('/donations'))) {
      if (!canCreateDonation(role)) {
        return response(403, { message: 'You do not have permission to create donations' });
      }

      const body =
        typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};

      if (!body.donorName || !body.description || !body.type) {
        return response(400, {
          message: 'donorName, type and description are required',
        });
      }

      const allowedTypes: DonationType[] = ['Financial', 'In-Kind'];
      if (!allowedTypes.includes(body.type)) {
        return response(400, { message: 'type must be Financial or In-Kind' });
      }

      if (body.type === 'Financial' && (body.amount === undefined || body.amount === null)) {
        return response(400, { message: 'amount is required for Financial donations' });
      }

      const newDonation = await createDonation({
        organizationId,
        donorName: body.donorName,
        type: body.type,
        amount: body.amount,
        description: body.description,
        linkedCaseId: body.linkedCaseId,
        createdBy: email,
      });

      await writeAuditLog({
        organizationId,
        action: 'CREATE',
        entity: 'DONATION',
        entityId: newDonation.donationId,
        performedBy: email,
        details: `Recorded donation from ${body.donorName}`,
      });

      return response(201, { donation: newDonation });
    }

    if (method === 'PATCH' && pathParameters.donationId) {
      if (!canEditDonationStatus(role)) {
        return response(403, {
          message: 'You do not have permission to update donation status',
        });
      }

      const body =
        typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};

      const allowedStatuses: DonationStatus[] = ['Received', 'Allocated', 'Used'];
      if (!body.status || !allowedStatuses.includes(body.status)) {
        return response(400, { message: 'Valid status is required' });
      }

      await updateDonationStatus(organizationId, pathParameters.donationId, body.status);

      await writeAuditLog({
        organizationId,
        action: 'UPDATE_STATUS',
        entity: 'DONATION',
        entityId: pathParameters.donationId,
        performedBy: email,
        details: `Changed donation status to ${body.status}`,
      });

      return response(200, { message: 'Status updated' });
    }

    return response(404, { message: 'Route not found' });
  } catch (error: any) {
    console.error(error);
    return response(500, { message: 'Internal server error', detail: error.message });
  }
}
