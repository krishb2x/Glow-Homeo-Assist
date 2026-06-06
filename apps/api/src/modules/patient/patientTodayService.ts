import type { SupabaseClient } from "@supabase/supabase-js";
import { mapPrescriptionItems, dietItemsFromAdvice, restrictionsFromAdvice } from "./patientMappers";
import type { PatientContext, MedicationSlot } from "./types";
import { signedObjectUrl } from "./patientMedia";

const SLOTS: MedicationSlot[] = ["morning", "afternoon", "evening", "night"];

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function firstName(fullName: string): string {
  const t = fullName.trim().split(/\s+/)[0];
  return t || "there";
}

export async function buildPatientToday(
  admin: SupabaseClient,
  ctx: PatientContext
): Promise<Record<string, unknown>> {
  const today = utcDateString();

  const { data: patient } = await admin
    .from("patients")
    .select("name,assigned_doctor_id")
    .eq("id", ctx.patientId)
    .maybeSingle();

  const patientName = (patient as { name?: string } | null)?.name ?? "Patient";

  const { data: latestRx } = await admin
    .from("prescriptions")
    .select("id,items,consultation_id,created_at")
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let medication: Record<string, unknown> | undefined;
  if (latestRx) {
    const rxId = (latestRx as { id: string }).id;
    const items = mapPrescriptionItems((latestRx as { items: unknown }).items);

    const { data: logs } = await admin
      .from("patient_medication_logs")
      .select("item_id,slot,taken_at,status")
      .eq("patient_id", ctx.patientId)
      .eq("prescription_id", rxId)
      .eq("taken_date", today);

    const logMap = new Map<string, Map<string, string>>();
    for (const log of logs ?? []) {
      const row = log as { item_id: string; slot: string; taken_at: string };
      if (!logMap.has(row.item_id)) logMap.set(row.item_id, new Map());
      logMap.get(row.item_id)!.set(row.slot, row.taken_at);
    }

    medication = {
      prescriptionId: rxId,
      items: items.map((item) => {
        const slots = (item.timingSlots?.length ? item.timingSlots : ["morning"]) as MedicationSlot[];
        const loggedToday: Record<string, string | null> = {};
        for (const slot of SLOTS) {
          if (slots.includes(slot)) {
            loggedToday[slot] = logMap.get(item.id)?.get(slot) ?? null;
          }
        }
        return { ...item, timingSlots: slots, loggedToday };
      })
    };
  }

  let dietAdviceSource: { advice?: unknown; clinical_record?: unknown } | null = null;
  if (latestRx) {
    const consultId = (latestRx as { consultation_id: string }).consultation_id;
    const { data: consult } = await admin
      .from("consultations")
      .select("advice,clinical_record")
      .eq("id", consultId)
      .maybeSingle();
    if (consult) {
      dietAdviceSource = consult as { advice?: unknown; clinical_record?: unknown };
    }
  }

  const dietItems = dietItemsFromAdvice(
    dietAdviceSource?.advice,
    dietAdviceSource?.clinical_record
  );

  const { data: dietLog } = await admin
    .from("patient_diet_logs")
    .select("on_plan")
    .eq("patient_id", ctx.patientId)
    .eq("log_date", today)
    .maybeSingle();

  const dietChecked = Boolean((dietLog as { on_plan?: boolean } | null)?.on_plan);

  const diet = {
    items: dietItems.map((d, i) => ({
      id: d.id,
      text: d.text,
      checked: dietChecked && i === 0 ? true : false
    }))
  };

  const restrictions = restrictionsFromAdvice(
    dietAdviceSource?.advice,
    dietAdviceSource?.clinical_record
  );

  let tip: Record<string, unknown> | undefined;
  const { data: assignment } = await admin
    .from("patient_content_assignments")
    .select("content_id,clinic_content_items(id,kind,title,thumbnail_url,duration_seconds,media_object_id)")
    .eq("patient_id", ctx.patientId)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const contentFromAssign = (assignment as { clinic_content_items?: Record<string, unknown> } | null)
    ?.clinic_content_items;

  let contentRow = contentFromAssign;
  if (!contentRow) {
    const { data: published } = await admin
      .from("clinic_content_items")
      .select("id,kind,title,thumbnail_url,duration_seconds,media_object_id")
      .eq("clinic_id", ctx.clinicId)
      .eq("is_published", true)
      .eq("kind", "video")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    contentRow = published as Record<string, unknown> | undefined;
  }

  if (contentRow) {
    let thumbnailUrl = (contentRow.thumbnail_url as string | null) ?? undefined;
    const mediaId = contentRow.media_object_id as string | null;
    if (mediaId && !thumbnailUrl) {
      const { data: media } = await admin
        .from("media_objects")
        .select("storage_object_key")
        .eq("id", mediaId)
        .maybeSingle();
      thumbnailUrl = await signedObjectUrl(
        (media as { storage_object_key?: string } | null)?.storage_object_key
      );
    }
    tip = {
      id: contentRow.id,
      kind: contentRow.kind,
      title: contentRow.title,
      thumbnailUrl,
      durationSec: contentRow.duration_seconds ?? undefined
    };
  }

  const now = Date.now();
  const { data: nextApt } = await admin
    .from("appointments")
    .select("id,scheduled_for,consultation_mode,status,reason,doctor_id")
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .in("status", ["REQUESTED", "CONFIRMED", "IN_PROGRESS"])
    .gte("scheduled_for", new Date(now - 3600000).toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(1)
    .maybeSingle();

  let nextEvent: Record<string, unknown> | undefined;
  if (nextApt) {
    const apt = nextApt as {
      id: string;
      scheduled_for: string;
      consultation_mode: string;
      status: string;
      reason: string | null;
    };
    const scheduledMs = new Date(apt.scheduled_for).getTime();
    const canJoinNow =
      scheduledMs - 15 * 60_000 <= now && now <= scheduledMs + 90 * 60_000 && apt.status !== "CANCELLED";
    nextEvent = {
      kind: "appointment",
      id: apt.id,
      title: apt.reason?.trim() || "Upcoming appointment",
      scheduledFor: apt.scheduled_for,
      mode: apt.consultation_mode ?? "IN_CLINIC",
      canJoinNow
    };
  } else {
    const { data: nextFu } = await admin
      .from("follow_ups")
      .select("id,due_at,title")
      .eq("patient_id", ctx.patientId)
      .in("status", ["PENDING", "IN_PROGRESS"])
      .gte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (nextFu) {
      nextEvent = {
        kind: "follow_up",
        id: (nextFu as { id: string }).id,
        title: (nextFu as { title: string }).title,
        scheduledFor: (nextFu as { due_at: string }).due_at,
        canJoinNow: false
      };
    }
  }

  // Calculate unread messages (V2 Schema)
  let unread = 0;
  const { data: convs } = await admin.from("conversations").select("id").eq("patient_id", ctx.patientId);
  const convIds = (convs || []).map(c => (c as { id: string }).id);
  
  if (convIds.length > 0) {
      const { data: msgs } = await admin
        .from("messages")
        .select("id")
        .in("conversation_id", convIds)
        .neq("sender_type", "PATIENT");
        
      const msgIds = (msgs || []).map(m => (m as { id: string }).id);
      
      if (msgIds.length > 0 && ctx.authUserId) {
          const { data: reads } = await admin
            .from("message_read_receipts")
            .select("message_id")
            .in("message_id", msgIds)
            .eq("user_id", ctx.authUserId);
            
          unread = msgIds.length - (reads?.length || 0);
      } else if (msgIds.length > 0) {
          // If no auth user id, just assume all are unread for now
          unread = msgIds.length;
      }
  }

  const { count: streakDays } = await admin
    .from("patient_medication_logs")
    .select("taken_date", { count: "exact", head: true })
    .eq("patient_id", ctx.patientId)
    .gte("taken_at", new Date(now - 30 * 86400000).toISOString());

  return {
    greeting: {
      name: firstName(patientName),
      streakDays: Math.min(30, streakDays ?? 0)
    },
    medication,
    diet,
    tip,
    restrictions,
    nextEvent,
    unreadMessageCount: unread ?? 0
  };
}
