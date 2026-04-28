import type {
  DashboardRecentItem,
  FollowUpQueueItem,
  InboxMessageItem,
  MyDayAppointment,
  MyDayResponse,
  PatientListItem,
  PatientTag,
  WorkspaceContext
} from "./doctor-api";

const P1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const P2 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2";
const P3 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3";
const P4 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4";
const C1 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const C2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2";
const A1 = "cccccccc-cccc-cccc-cccc-ccccccccccc1";
const A2 = "cccccccc-cccc-cccc-cccc-ccccccccccc2";
const A3 = "cccccccc-cccc-cccc-cccc-ccccccccccc3";

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3600000).toISOString();
}
function startOfTodayPlus(h: number, m: number): string {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() < Date.now() - 86400000) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString();
}

export const DEMO_PATIENTS: PatientListItem[] = [
  {
    id: P1,
    name: "Ananya Sharma",
    phone: "+91 98765 43210",
    age: 34,
    initialChiefComplaint: "Recurring stress headaches, worse in afternoon",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastVisitAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    tags: ["chronic", "follow_up"] satisfies PatientTag[]
  },
  {
    id: P2,
    name: "R. Krishnan",
    phone: "+91 91234 55678",
    age: 58,
    initialChiefComplaint: "Follow-up: joint stiffness, winter aggravation",
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    lastVisitAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    tags: ["chronic", "follow_up"] satisfies PatientTag[]
  },
  {
    id: P3,
    name: "Meera Patel",
    phone: "+91 99887 77665",
    age: 6,
    initialChiefComplaint: "Allergic rhinitis, clear discharge",
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    lastVisitAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    tags: ["acute", "follow_up"] satisfies PatientTag[]
  },
  {
    id: P4,
    name: "James D’Souza",
    phone: "+91 90012 30045",
    age: 45,
    initialChiefComplaint: "New — fatigue and disturbed sleep",
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    lastVisitAt: null,
    tags: ["first_visit", "acute"] satisfies PatientTag[]
  }
];

export const DEMO_INBOX: InboxMessageItem[] = [
  {
    id: "m1",
    patientId: P1,
    patientName: "Ananya Sharma",
    body: "Doctor, the headaches are a bit better this week. Should I continue the same remedy?",
    readAt: null,
    createdAt: hoursFromNow(-5),
    fromDoctor: false
  },
  {
    id: "m1-r1",
    patientId: P1,
    patientName: "Ananya Sharma",
    body: "Yes — continue for one more week at the same potency, then message me before changing anything.",
    readAt: new Date().toISOString(),
    createdAt: hoursFromNow(-4.5),
    fromDoctor: true
  },
  {
    id: "m2",
    patientId: P2,
    patientName: "R. Krishnan",
    body: "Can we move my follow-up to next Thursday afternoon?",
    readAt: new Date().toISOString(),
    createdAt: hoursFromNow(-26),
    fromDoctor: false
  },
  {
    id: "m3",
    patientId: P3,
    patientName: "Meera Patel",
    body: "School asked for a fitness note when she returns.",
    readAt: null,
    createdAt: hoursFromNow(-50),
    fromDoctor: false
  }
];

function todayAppointments(): MyDayAppointment[] {
  return [
    {
      id: A1,
      scheduledFor: startOfTodayPlus(9, 30),
      durationMinutes: 30,
      status: "CONFIRMED",
      patientId: P1,
      patientName: "Ananya Sharma",
      complexity: "STANDARD",
      reason: "Follow-up",
      chiefComplaint: "Headaches",
      displayTag: "follow_up"
    },
    {
      id: A2,
      scheduledFor: startOfTodayPlus(11, 0),
      durationMinutes: 30,
      status: "CONFIRMED",
      patientId: P3,
      patientName: "Meera Patel",
      complexity: "SIMPLE",
      reason: null,
      chiefComplaint: "Allergic rhinitis",
      displayTag: "acute"
    },
    {
      id: A3,
      scheduledFor: startOfTodayPlus(16, 0),
      durationMinutes: 45,
      status: "CONFIRMED",
      patientId: P4,
      patientName: "James D’Souza",
      complexity: "STANDARD",
      reason: "New patient visit",
      chiefComplaint: "Fatigue",
      displayTag: "first_visit"
    }
  ];
}

export function buildDemoMyDay(): MyDayResponse {
  const from = new Date();
  from.setDate(from.getDate() - 1);
  const to = new Date();
  to.setDate(to.getDate() + 7);
  const fu1: FollowUpQueueItem = {
    id: "fu-1",
    patientId: P2,
    patientName: "R. Krishnan",
    phone: "+91 91234 55678",
    dueAt: new Date().toISOString(),
    overdue: true,
    title: "14-day check-in",
    sourceConsultationId: C1,
    source: "suggested"
  };
  const fu2: FollowUpQueueItem = {
    id: "fu-2",
    patientId: P1,
    patientName: "Ananya Sharma",
    dueAt: hoursFromNow(8),
    overdue: false,
    title: "Review remedy response",
    sourceConsultationId: C2,
    source: "intentional"
  };
  return {
    window: { from: from.toISOString(), to: to.toISOString(), days: 7 },
    upcomingAppointments: todayAppointments(),
    followUps: [fu1, fu2],
    pendingOutcomes: [
      {
        consultationId: C1,
        patientId: P2,
        patientName: "R. Krishnan",
        endedAt: hoursFromNow(-120),
        summary: "joint review"
      }
    ],
    needsNoteFinalization: [
      {
        consultationId: C2,
        patientId: P1,
        patientName: "Ananya Sharma",
        startedAt: hoursFromNow(-2)
      }
    ],
    activeConsultations: {
      inClinic: [
        {
          id: "dddddddd-dddd-dddd-dddd-dddddddd0001",
          patientId: P4,
          patientName: "James D’Souza",
          startedAt: hoursFromNow(-0.5)
        }
      ],
      online: [
        {
          id: "dddddddd-dddd-dddd-dddd-dddddddd0002",
          patientId: P1,
          patientName: "Ananya Sharma",
          startedAt: hoursFromNow(-0.15)
        }
      ]
    }
  };
}

export const DEMO_WORKSPACE: WorkspaceContext = {
  fullName: "Dr. Neha Iyer",
  firstName: "Neha",
  clinicName: "Verdant Homeopathy Clinic",
  clinicLocation: "12 Residency Road, Bengaluru, Karnataka 560025",
  clinicPhone: "+91 80 4000 1200",
  clinicEmail: "care@verdanthomeo.example",
  clinicId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  credentials: "BHMS, MD (Hom.)",
  qualification: "BHMS, MD (Hom.)",
  registrationNumber: "KA-12345",
  signatureUrl: null,
  prescriptionDocumentPrefs: {
    showClinicDetails: true,
    showSignature: true,
    showRegistrationNumber: true
  },
  role: "DOCTOR"
};

export const DEMO_DASHBOARD_RECENT: DashboardRecentItem[] = [
  {
    id: "act-1",
    kind: "message",
    title: "Message received",
    subtitle: "Ananya Sharma — follow-up on remedy",
    at: hoursFromNow(-1.5),
    href: "/messages"
  },
  {
    id: "act-2",
    kind: "prescription",
    title: "Prescription created",
    subtitle: "Meera Patel (rhinitis plan)",
    at: hoursFromNow(-4),
    href: `/patients/${P3}/prescription`
  },
  {
    id: "act-3",
    kind: "followup",
    title: "Follow-up visit logged",
    subtitle: "R. Krishnan — check-in note saved",
    at: hoursFromNow(-20),
    href: "/follow-ups"
  }
];

export type AppointmentListItem = {
  id: string;
  scheduledFor: string;
  durationMinutes: number;
  status: string;
  patientId: string;
  patientName: string;
  reason: string | null;
  notes?: string | null;
};

export function buildDemoAppointmentsWeek(): AppointmentListItem[] {
  const base = new Date();
  const out: AppointmentListItem[] = [];
  for (let d = 0; d < 7; d++) {
    const day = new Date(base);
    day.setDate(base.getDate() + d);
    day.setHours(10, 0, 0, 0);
    out.push({
      id: `demo-w-${d}-1`,
      scheduledFor: day.toISOString(),
      durationMinutes: 30,
      status: "CONFIRMED",
      patientId: P1,
      patientName: "Ananya Sharma",
      reason: d === 0 ? "Today slot" : "Booked"
    });
  }
  return out.concat(
    todayAppointments().map((a) => ({
      id: a.id,
      scheduledFor: a.scheduledFor,
      durationMinutes: a.durationMinutes,
      status: a.status,
      patientId: a.patientId,
      patientName: a.patientName,
      reason: a.reason
    }))
  );
}
