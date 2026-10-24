# ServeHub

Unified Case and Resource Management System for social service agencies.

ServeHub helps organizations manage beneficiary cases, donations, staff access, and audit activity in a multi-tenant cloud architecture on AWS.

---

## 1. Purpose

Social service teams often track cases and resources across spreadsheets, email, and disconnected tools. ServeHub provides:

- Structured case intake and status tracking
- Donation and fund allocation records
- Role-based staff access
- Audit logging for accountability
- Operational dashboard and exportable reports

Design priorities: data privacy, administrative efficiency, and accessibility over decorative UI trends.

---

## 2. High-Level Architecture

```text
┌─────────────────────────────┐
│  Browser (React SPA)        │
│  Vite + TypeScript + Tailwind│
└──────────────┬──────────────┘
               │ HTTPS
               │ Authorization: Bearer <Cognito ID token>
               ▼
┌─────────────────────────────┐
│  Amazon API Gateway (HTTP)  │
│  Cognito JWT Authorizer     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  AWS Lambda (Node.js 20)    │
│  cases | donations | users  │
│  audit                      │
└───────┬───────────┬─────────┘
        │           │
        ▼           ▼
┌──────────────┐  ┌─────────────────────┐
│  DynamoDB    │  │  Amazon Cognito     │
│  servehub-   │  │  User Pool          │
│  main        │  │  custom:role        │
│  single-table│  │  custom:organizationId │
└──────────────┘  └─────────────────────┘




