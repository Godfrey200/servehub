import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_USER_POOL_ID,
  ClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
};

const userPool = new CognitoUserPool(poolData);

export interface AuthUser {
  email: string;
  name: string;
  organizationId: string;
  role: string;
  accessToken: string;
  idToken: string;
}

export function signIn(email: string, password: string): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session: CognitoUserSession) => {
        const idToken = session.getIdToken();
        const payload = idToken.payload;

        resolve({
          email: payload.email,
          name: payload.name || payload.email,
          organizationId: payload['custom:organizationId'] || '',
          role: payload['custom:role'] || 'Auditor',
          accessToken: session.getAccessToken().getJwtToken(),
          idToken: idToken.getJwtToken(),
        });
      },
      onFailure: (err) => {
        reject(err);
      },
      newPasswordRequired: () => {
        reject(new Error('New password required. Please contact administrator.'));
      },
    });
  });
}

export function signOut(): void {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
  localStorage.removeItem('servehub_user');
}

export function getCurrentUser(): AuthUser | null {
  const stored = localStorage.getItem('servehub_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveUser(user: AuthUser): void {
  localStorage.setItem('servehub_user', JSON.stringify(user));
}
