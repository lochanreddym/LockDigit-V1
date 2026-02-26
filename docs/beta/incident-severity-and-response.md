# Incident Severity And Response

## Severity Definitions

- Sev1: Critical security or money-movement integrity failure
  - Example: cross-tenant data access, unauthorized payment finalization
- Sev2: Major user-facing outage or degraded payment/auth pipeline
  - Example: webhook backlog causing broad payment status delay
- Sev3: Partial degradation with workarounds
  - Example: non-critical verification retries failing
- Sev4: Low-impact defect or internal tooling issue

## Response Targets

- Sev1:
  - Acknowledge within 5 minutes
  - Mitigate within 30 minutes
  - Leadership update every 30 minutes
- Sev2:
  - Acknowledge within 15 minutes
  - Mitigate within 2 hours
  - Stakeholder update every 60 minutes
- Sev3:
  - Acknowledge within 2 hours
  - Mitigate within 24 hours
  - Stakeholder update as needed
- Sev4:
  - Acknowledge within 24 hours
  - Mitigate within 1 week
  - Stakeholder update optional

## Incident Command Roles

- Incident commander: drives decisions and communication
- Operations lead: executes runbook actions
- Scribe: records timeline and decisions
- Security lead: mandatory for Sev1 and auth/payment incidents

## Postmortem

- Sev1 and Sev2 require postmortem within 48 hours.
- Required sections:
  - Timeline
  - Root cause
  - Blast radius
  - Corrective actions with owners and due dates
