import { getCurrentUser } from './auth';

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeaders(): HeadersInit {
  const user = getCurrentUser();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (user?.idToken) {
    headers['Authorization'] = `Bearer ${user.idToken}`;
  }

  return headers;
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function getCases() {
  const res = await fetch(`${API_URL}/cases`, { headers: getAuthHeaders() });
  const data = await handleResponse(res);
  return data.cases || [];
}

export async function createCase(payload: {
  beneficiaryName: string;
  summary: string;
  priority: string;
  contactPhone?: string;
  notes?: string;
}) {
  const res = await fetch(`${API_URL}/cases`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  return data.case;
}

export async function updateCaseStatus(caseId: string, status: string) {
  const res = await fetch(`${API_URL}/cases/${caseId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  await handleResponse(res);
}

export async function getDonations() {
  const res = await fetch(`${API_URL}/donations`, { headers: getAuthHeaders() });
  const data = await handleResponse(res);
  return data.donations || [];
}

export async function createDonation(payload: {
  donorName: string;
  type: 'Financial' | 'In-Kind';
  amount?: number;
  description: string;
  linkedCaseId?: string;
}) {
  const res = await fetch(`${API_URL}/donations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  return data.donation;
}

export async function updateDonationStatus(donationId: string, status: string) {
  const res = await fetch(`${API_URL}/donations/${donationId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  await handleResponse(res);
}

export async function getUsers() {
  const res = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
  const data = await handleResponse(res);
  return data.users || [];
}

export async function createUser(payload: {
  email: string;
  name: string;
  role: string;
}) {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  return data.user;
}

export async function updateUser(
  userId: string,
  payload: { email: string; name?: string; role?: string }
) {
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  await handleResponse(res);
}

export async function deleteUser(userId: string, email: string) {
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email }),
  });
  await handleResponse(res);
}

export async function getAuditLogs() {
  const res = await fetch(`${API_URL}/audit`, { headers: getAuthHeaders() });
  const data = await handleResponse(res);
  return data.logs || [];
}
