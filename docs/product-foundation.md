# Product Foundation

## Product Intent

HomeoAssist AI helps homeopathy doctors run daily clinic operations while reducing documentation burden. AI remains assistive and never replaces clinical judgment.

## Primary Users

### Doctor

- Runs consultations, creates and reviews case notes, writes prescriptions, and manages follow-ups.
- Needs speed, trust, flexibility, and minimal disruption during patient conversations.

### Clinic Admin (Platform-side)

- Verifies doctor qualifications and provisions clinic accounts.
- Needs controlled workflows and clear audit trail.

### Support

- Helps clinics onboard and resolve usage issues.
- Needs read-safe tools and operational diagnostics.

### Patient

- Books appointments, receives reminders, and views prescription code entries.
- Needs clarity, simplicity, and privacy.

## Product Constraints

- AI does not diagnose or prescribe.
- Audio capture is optional and controlled by doctor.
- Raw audio is deleted after processing.
- Multi-tenant isolation is mandatory.
- Manual onboarding and subscription operations are accepted in early stage.

## Usability Principles

- One-screen consultation workflow with low click count.
- Progressive disclosure: show advanced options only when required.
- AI output is always editable and must be explicitly finalized by doctor.
- Role-specific interfaces avoid exposing non-essential actions.
