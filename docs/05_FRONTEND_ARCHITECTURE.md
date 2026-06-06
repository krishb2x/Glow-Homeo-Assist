# Frontend Architecture

The Doctor Portal is a Next.js application (`apps/web`) serving as the single pane of glass for clinical operations.

## Technology Stack
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS + bespoke Design System (`packages/ui`)
- **State Management:** React Context and local component state.
- **Data Fetching:** SWR / React Query for efficient, cached API interactions.

## Core Layouts
- **Dashboard:** High-level metrics, upcoming appointments, and daily summaries.
- **Patient Workspace:** A 3-column layout featuring the patient profile, historical chart timeline, and the active consultation interface.
- **Unified Inbox:** A real-time message center displaying inbound WhatsApp messages from the Clinical channel.
