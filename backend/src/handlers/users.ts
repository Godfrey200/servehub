import { listUsers, createUser, updateUser, deleteUser } from '../services/userService';
import { writeAuditLog } from '../services/auditService';
import { UserRole } from '../models/user';
import { getAuthContext, canManageUsers } from '../utils/permissions';

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
    if (!canManageUsers(role)) {
      return response(403, { message: 'Only SystemAdmin can manage users' });
    }

    // LIST
    if (method === 'GET' && (path === '/users' || path.endsWith('/users'))) {
      const users = await listUsers(organizationId);
      return response(200, { users });
    }

    // CREATE
    if (method === 'POST' && (path === '/users' || path.endsWith('/users'))) {
      const body =
        typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};

      if (!body.email || !body.name || !body.role) {
        return response(400, { message: 'email, name and role are required' });
      }

      const allowedRoles: UserRole[] = [
        'SystemAdmin',
        'CaseWorker',
        'VolunteerCoordinator',
        'Auditor',
      ];
      if (!allowedRoles.includes(body.role)) {
        return response(400, { message: 'Invalid role' });
      }

      try {
        const user = await createUser({
          organizationId,
          email: body.email,
          name: body.name,
          role: body.role,
          createdBy: email,
        });

        await writeAuditLog({
          organizationId,
          action: 'CREATE',
          entity: 'USER',
          entityId: user.userId,
          performedBy: email,
          details: `Created user ${body.email} with role ${body.role}`,
        });

        return response(201, {
          user,
          temporaryPassword: 'ServeHub2026!',
          message: 'User created. They can sign in with the temporary password.',
        });
      } catch (err: any) {
        if (err.name === 'UsernameExistsException') {
          return response(409, { message: 'A user with this email already exists' });
        }
        throw err;
      }
    }

    // UPDATE (name and/or role)
    if (method === 'PATCH' && pathParameters.userId) {
      const body =
        typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};

      if (!body.email) {
        return response(400, { message: 'email is required' });
      }

      const allowedRoles: UserRole[] = [
        'SystemAdmin',
        'CaseWorker',
        'VolunteerCoordinator',
        'Auditor',
      ];

      if (body.role && !allowedRoles.includes(body.role)) {
        return response(400, { message: 'Invalid role' });
      }

      await updateUser({
        organizationId,
        userId: pathParameters.userId,
        email: body.email,
        name: body.name,
        role: body.role,
      });

      await writeAuditLog({
        organizationId,
        action: 'UPDATE',
        entity: 'USER',
        entityId: pathParameters.userId,
        performedBy: email,
        details: `Updated user ${body.email}`,
      });

      return response(200, { message: 'User updated' });
    }

    // DELETE
    if (method === 'DELETE' && pathParameters.userId) {
      const body =
        typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};

      if (!body.email) {
        return response(400, { message: 'email is required to delete Cognito user' });
      }

      // Prevent self-delete
      if (body.email === email) {
        return response(400, { message: 'You cannot delete your own account' });
      }

      await deleteUser({
        organizationId,
        userId: pathParameters.userId,
        email: body.email,
      });

      await writeAuditLog({
        organizationId,
        action: 'DELETE',
        entity: 'USER',
        entityId: pathParameters.userId,
        performedBy: email,
        details: `Deleted user ${body.email}`,
      });

      return response(200, { message: 'User deleted from Cognito and directory' });
    }

    return response(404, { message: 'Route not found' });
  } catch (error: any) {
    console.error(error);
    return response(500, { message: 'Internal server error', detail: error.message });
  }
}
