# Role Permissions Matrix

## Super Admin

- Approve or reject clinic onboarding requests.
- View and update subscription status.
- Enable or disable global feature flags.
- Access cross-tenant operational dashboards.

## Admin

- Verify doctor qualifications.
- Create clinics and assign initial doctor user.
- Manage onboarding workflow status.
- Cannot access consultation clinical content unless explicitly granted.

## Support

- View onboarding and support ticket status.
- Assist with account setup and feature enablement.
- Access operational logs scoped to assigned clinics.
- Cannot modify prescriptions or finalized clinical notes.

## Doctor

- Full patient and case management within own clinic.
- Start/end consultation sessions with optional recording.
- Generate AI draft notes and finalize edited notes.
- Create prescriptions with doctor-private remedy and patient-visible code.
- Configure reminder plans and optional WhatsApp integration details.

## Patient

- Book appointments.
- View own code-based prescriptions.
- Receive and manage reminder preferences.
- Access own case timeline summaries only as shared by doctor/clinic policy.
