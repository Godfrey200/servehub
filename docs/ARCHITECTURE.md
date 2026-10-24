# ServeHub Architecture

Technical architecture for ServeHub: a multi-tenant case and resource management platform for social service agencies.

---

## 1. System context

```text
                    ┌──────────────────────────┐
                    │   Social service staff   │
                    │  Admin / Case worker /   │
                    │  Coordinator / Auditor   │
                    └────────────┬─────────────┘
                                 │
                                 │ HTTPS
                                 ▼
                    ┌──────────────────────────┐
                    │     ServeHub Frontend    │
                    │   React SPA (browser)    │
                    └────────────┬─────────────┘
                                 │
                    REST + JWT Bearer token
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      ServeHub API        │
                    │  API Gateway + Lambda    │
                    └──────┬───────────┬───────┘
                           │           │
              ┌────────────┘           └────────────┐
              ▼                                     ▼
   ┌────────────────────┐              ┌────────────────────┐
   │     DynamoDB       │              │      Cognito       │
   │  servehub-main     │              │  identity + roles  │
   └────────────────────┘              └────────────────────┘


				┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  React + Vite + TypeScript + Tailwind                             │  │
│  │  Pages: Login, Dashboard, Cases, Donations, Users, Audit          │  │
│  │  lib/auth.ts  lib/api.ts  lib/permissions.ts                      │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │
                    Authorization: Bearer <Cognito ID token>
                                   │
┌──────────────────────────────────┼──────────────────────────────────────┐
│                           EDGE / API LAYER                              │
│  ┌───────────────────────────────▼───────────────────────────────────┐  │
│  │  Amazon API Gateway (HTTP API)  servehub-api                      │  │
│  │  - Routes: /cases /donations /users /audit                        │  │
│  │  - HttpJwtAuthorizer (Cognito User Pool)                          │  │
│  │  - CORS preflight                                                 │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────┐
│                          COMPUTE LAYER                                  │
│          ┌───────────────┬───────┴───────┬───────────────┐              │
│          ▼               ▼               ▼               ▼              │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│   │  Cases     │  │ Donations  │  │   Users    │  │   Audit    │        │
│   │  Lambda    │  │  Lambda    │  │  Lambda    │  │  Lambda    │        │
│   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
│         │               │               │               │               │
│         └───────────────┴───────┬───────┴───────────────┘               │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                                                 ▼
┌───────────────────┐                           ┌───────────────────┐
│     DynamoDB      │                           │      Cognito      │
│  servehub-main    │                           │  User Pool        │
│  Single-table     │                           │  custom:role      │
│  PK = ORG#orgId   │                           │  custom:orgId     │
└───────────────────┘                           └───────────────────┘


User action (e.g. open Cases)
        │
        ▼
ProtectedRoute checks getCurrentUser()
        │
        ├─ no user → redirect /login
        │
        ▼
Page calls getCases() in lib/api.ts
        │
        ▼
getAuthHeaders() attaches:
  Content-Type: application/json
  Authorization: Bearer <idToken>
        │
        ▼
fetch(VITE_API_URL + '/cases')
        │
        ▼
Render table / handle 401 / 403 / 500


API Gateway receives request
        │
        ▼
JWT Authorizer validates Cognito token
        │
        ├─ invalid / missing → 401 from API Gateway
        │
        ▼
Lambda handler starts
        │
        ▼
getAuthContext(event)
  reads event.requestContext.authorizer.jwt.claims
  extracts email, role, organizationId, sub
        │
        ├─ missing claims → 401
        │
        ▼
RBAC check (canCreateCase, canManageUsers, ...)
        │
        ├─ denied → 403
        │
        ▼
Service layer (DynamoDB / Cognito)
        │
        ▼
Optional writeAuditLog(...)
        │
        ▼
JSON response + CORS headers

BACKEND REQUEST FLOW
API Gateway receives request
        │
        ▼
JWT Authorizer validates Cognito token
        │
        ├─ invalid / missing → 401 from API Gateway
        │
        ▼
Lambda handler starts
        │
        ▼
getAuthContext(event)
  reads event.requestContext.authorizer.jwt.claims
  extracts email, role, organizationId, sub
        │
        ├─ missing claims → 401
        │
        ▼
RBAC check (canCreateCase, canManageUsers, ...)
        │
        ├─ denied → 403
        │
        ▼
Service layer (DynamoDB / Cognito)
        │
        ▼
Optional writeAuditLog(...)
        │
        ▼
JSON response + CORS headers
SEQUENCE DIAGRAMS
			LOGIN
Browser                 Cognito              Frontend storage
   │                       │                        │
   │  email + password     │                        │
   │──────────────────────►│                        │
   │                       │                        │
   │  ID token + claims    │                        │
   │◄──────────────────────│                        │
   │                       │                        │
   │  save servehub_user (email, role, idToken)     │
   │───────────────────────────────────────────────►│
			ADMIN Create case
Browser          API Gateway         JWT Auth       Cases Lambda      DynamoDB
   │                  │                 │                │               │
   │ POST /cases      │                 │                │               │
   │ Authorization    │                 │                │               │
   │─────────────────►│                 │                │               │
   │                  │ validate JWT    │                │               │
   │                  │────────────────►│                │               │
   │                  │ ok + claims     │                │               │
   │                  │◄────────────────│                │               │
   │                  │ invoke                         │               │
   │                  │────────────────────────────────►│               │
   │                  │                 │  RBAC + write │               │
   │                  │                 │───────────────┼──────────────►│
   │                  │                 │  audit write  │               │
   │                  │                 │───────────────┼──────────────►│
   │  201 + case      │                 │                │               │
   │◄─────────────────┴─────────────────┴────────────────│               │


			ADMIN deletes user

Browser          API Gateway       Users Lambda      Cognito       DynamoDB
   │                  │                 │               │             │
   │ DELETE /users/id │                 │               │             │
   │ + { email }      │                 │               │             │
   │─────────────────►│                 │               │             │
   │                  │────────────────►│               │             │
   │                  │  SystemAdmin?   │               │             │
   │                  │  AdminDeleteUser│               │             │
   │                  │─────────────────┼──────────────►│             │
   │                  │  Delete USER#   │               │             │
   │                  │─────────────────┼───────────────┼────────────►│
   │                  │  audit DELETE   │               │             │
   │  200             │◄────────────────│               │             │
   │◄─────────────────│                 │               │             │


INFRASTURCTURE ARCHITECTURE (CDK)
infra/
├── bin/servehub.ts          # App entry: Auth + Data + Api stacks
└── lib/
    ├── auth-stack.ts        # Cognito User Pool + Client
    ├── data-stack.ts        # DynamoDB table
    └── api-stack.ts         # HTTP API, JWT authorizer, Lambdas, IAM


DEPLOYMENT TOPOLOGY
Developer machine                  AWS
─────────────────                  ───
npm run dev (localhost)
        │
        └──────── REST/JWT ───────► API Gateway → Lambda → DynamoDB/Cognito
