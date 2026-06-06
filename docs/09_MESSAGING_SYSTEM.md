# Messaging System

The unified messaging system centralizes clinic-patient communication.

## The Inbox Flow
1. Patient sends a text or image to the clinic's `CLINICAL` WhatsApp number.
2. Webhook hits `apps/api/src/modules/whatsapp/webhookHandler.ts`.
3. The handler identifies the `CLINICAL` connection, extracts the `patient_id` from the sender's phone, and saves the payload to the `messages` table under a `GENERAL` conversation.
4. Supabase Realtime pushes the update to the Next.js frontend.
5. The doctor replies in the Web UI.
6. The backend sends the text via the Meta Cloud API back to the patient.
