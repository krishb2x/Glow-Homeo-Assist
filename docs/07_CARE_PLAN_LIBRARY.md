# Care Plan Library

The Care Plan engine allows doctors to automate the longitudinal care of a patient.

## Features
- **Protocol Templates:** Standardized timelines of interventions for specific chronic conditions (e.g., PCOS, Acne, IBS).
- **Automated Triggers:** Care plans automatically queue jobs in the `notification_jobs` table to send daily diet reminders, medication schedules, and milestone check-ins via the `AUTOMATED` WhatsApp channel.
- **Adherence Tracking:** Patients use WhatsApp interactive buttons to confirm they took their medicine or followed their diet, updating the `patient_medication_logs` and `patient_diet_logs` tables.
