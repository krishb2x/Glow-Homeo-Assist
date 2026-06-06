# WhatsApp Patient Engagement System

GlowHomeo's patient ecosystem is built entirely around WhatsApp Business API (Meta Cloud API).

## Dual-Channel Strategy
Each clinic is provisioned with two numbers:
1. **Automated Channel (`AUTOMATED`):** Exclusively for outbound alerts, reminders, and interactive payloads (e.g., check-ins with quick replies). Free-form patient replies here trigger an auto-responder redirecting them to the clinical number.
2. **Clinical Channel (`CLINICAL`):** Dedicated to free-form messaging between the patient and the doctor. Messages sent here are routed to the doctor's Inbox in the web portal.

## WhatsApp Sessions
To comply with Meta's 24-hour service window policy, GlowHomeo tracks `whatsapp_sessions`. If a session is open, doctors can reply freely. If closed, the system forces the use of a pre-approved Meta Template to re-initiate contact.
