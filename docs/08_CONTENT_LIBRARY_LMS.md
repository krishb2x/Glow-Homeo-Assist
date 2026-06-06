# Content Library (LMS)

The Content Library acts as a lightweight Learning Management System for patient education.

## Architecture
- **Curated Content:** Doctors upload videos, PDFs, and articles to `clinic_content_items`.
- **Prescriptive Delivery:** During a consultation, a doctor can "prescribe" an educational video (e.g., "How to manage a fever at home").
- **WhatsApp Delivery:** The assignment is delivered as a trackable link via WhatsApp. 
- **Analytics:** The system tracks `viewed_at` and `completed_at` timestamps in `patient_content_assignments` when the patient consumes the content.
