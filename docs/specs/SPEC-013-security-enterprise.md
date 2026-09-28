# SPEC-013 — SAP RFUI Test Studio: Security, Access Control & Enterprise Readiness

**Priority:** P1  
**Depends on:** SPEC-001...SPEC-012

## 1. Цель

Подготовить систему к корпоративной эксплуатации:
- Identity;
- RBAC;
- granular permissions;
- workspace/environment policies;
- credential vault;
- runner authorization;
- policy engine;
- audit;
- signed snapshots/packages;
- data classification;
- retention;
- secure updates;
- threat model.

## 2. Architecture

```text
Identity
↓
Auth Context
↓
Authorization Service
↓
Application Use Case
↓
Core Domain
```

UI не является security boundary.

## 3. Identity

Types:
- local-user;
- remote-user;
- runner;
- service-account.

Standalone может использовать OS User.

Enterprise architecture должна позволять OIDC/SAML.

## 4. Roles

Baseline:
- Viewer;
- Tester;
- Automation Engineer;
- Project Admin;
- System Admin.

Но enforcement строится на permissions:
- project.read;
- scenario.write;
- scenario.execute;
- scenario.execute.destructive;
- baseline.approve;
- integration.manage;
- credentials.manage;
- runner.manage;
- user.manage.

## 5. Resource Scope

Permissions:
- global;
- project;
- workspace;
- environment.

Например EWD/EWT allowed, EWP denied.

## 6. Destructive Approval

Policy может требовать scoped approval:
- scenario;
- environment;
- approved user;
- approver;
- expiry.

Approval нельзя переиспользовать для другого scenario/environment.

## 7. Credential Vault

Все secrets через `CredentialVaultPort`.

Types:
- SAP credentials;
- Test IT token;
- AI key;
- Runner token;
- OIDC secret.

Domain хранит `credentialRef`.

Desktop adapters:
- Windows Credential Manager;
- macOS Keychain;
- Linux Secret Service.

Enterprise может использовать corporate vault.

## 8. Runner Authorization

Flow:
```text
Registration Request
↓
Admin Approval
↓
Credential Issued
↓
ACTIVE
```

States:
- PENDING;
- ACTIVE;
- DISABLED;
- REVOKED.

Rotation/revocation mandatory.

## 9. Workspace Integrity

Runner проверяет hash/signature immutable snapshot.

Mismatch:
`WORKSPACE_INTEGRITY_ERROR`.

Execution запрещён.

## 10. Policy Engine

Policies:
- environment execution;
- destructive actions;
- credential usage;
- external AI;
- artifact retention;
- unsigned packs;
- integrations;
- runner permissions;
- data export.

Decision:
- ALLOW;
- DENY;
- REQUIRE_APPROVAL.

Precedence:
```text
Enterprise Policy
↓
Project Policy
↓
User Preference
```

Нижний уровень не расширяет запрещённые права.

## 11. Audit

Audit fields:
- identity;
- action;
- resource;
- result;
- timestamp.

Audit events:
- scenario changes/execution;
- approvals;
- baseline changes;
- integration/credential changes;
- runner register/revoke;
- policy changes;
- exports.

Audit не содержит secrets и не редактируется обычным UI.

## 12. Data Classification / Masking

Levels:
- PUBLIC;
- INTERNAL;
- CONFIDENTIAL;
- RESTRICTED.

Masking применяется:
- before log;
- before AI;
- before export;
- before attachment upload.

## 13. Retention

Configurable retention policies.

Legal hold hook предусмотреть архитектурно.

## 14. Secure Updates

Update manifest:
- version;
- package hash;
- signature;
- channel.

Channels:
- stable;
- beta;
- internal.

Strict mode запрещает unsigned updates.

## 15. Threat Model

Обязательно создать `docs/security/threat-model.md`.

Threats:
- credential leakage;
- malicious workspace;
- tampered runner;
- unsafe SAP execution;
- artifact leakage;
- external AI leakage;
- token theft;
- privilege escalation.

## 16. Scenario DSL Security

Imported Scenario — untrusted input.

Запрещать:
- arbitrary shell commands;
- filesystem traversal;
- raw JS;
- arbitrary process execution;
- eval/new Function.

DSL декларативный.

## 17. Safe Defaults

- production disabled;
- destructive disabled;
- external AI opt-in;
- credentials non-exportable;
- unsigned packs restricted in enterprise strict mode.

## 18. Acceptance Criteria

- Identity/RBAC/permissions работают.
- Authorization выполняется в Application Layer.
- Environment/production/destructive policies работают.
- Credential Vault работает.
- Secrets не в DB/logs/exports.
- Runner registration/revocation работают.
- Integrity validation работает.
- Policy precedence работает.
- AI/export policies работают.
- Audit/Security Events работают.
- Masking/Retention работают.
- Signed update validation поддерживается.
- Scenario DSL запрещает arbitrary execution.
- Security tests проходят.

## 19. Definition of Done

Identity, RBAC, Vault, Runner Auth, Policy Engine, Audit, Data Protection, Secure Updates, Threat Model и security tests готовы.
