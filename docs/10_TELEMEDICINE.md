# Telemedicine

GlowHomeo supports fully integrated online consultations.

## Infrastructure
- **Provider:** Daily.co for WebRTC video rooms.
- **Workflow:** 
  1. Appointment is booked for `ONLINE` mode.
  2. A unique Daily.co room is generated via the backend.
  3. 15 minutes prior to the visit, an automated WhatsApp message with the secure join link is dispatched.
  4. The doctor joins the call directly inside the 3-column clinical workspace, conducting the consultation while viewing the patient's chart side-by-side.
