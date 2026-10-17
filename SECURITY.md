# Security

## Reporting a vulnerability

Do not open a public issue. Report it privately through GitHub (Security →
Report a vulnerability) or email **security@yarlis.com** with what you found,
how to reproduce it, and the affected commit. Leave out real customer data and
live secrets. We acknowledge within two working days and agree on disclosure
with you once a fix ships.

## Supported versions

Only the latest `main` (and what is deployed from it) receives fixes.

## How studio-sdk is kept safe

- Every PR and every push to `main` runs the org security suite from
  [bastion](https://github.com/YarlisAISolutions/bastion): gitleaks, Semgrep,
  OSV-Scanner and Trivy. Status and on-demand scans: https://security.yarlis.com
- Secrets live in Yarlis Keep (Google Secret Manager), never in git or `.env`.
- Dependabot watches dependencies and GitHub Actions, which are pinned by SHA.
