import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import { signedObjectUrl } from "./patientMedia";
import type { PatientContext } from "./types";

export async function listPatientConversations(
  admin: SupabaseClient,
  ctx: PatientContext,
  opts: { limit?: number }
): Promise<unknown[]> {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 50));
  
  // Fetch conversations
  const { data, error } = await admin
    .from("conversations")
    .select("id, context_type, context_id, status, updated_at")
    .eq("patient_id", ctx.patientId)
    .eq("clinic_id", ctx.clinicId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  // We should also ideally fetch the latest message for preview, but we'll stick to a simple mapping for now.
  return (data ?? []).map(row => ({
    id: row.id,
    contextType: row.context_type,
    contextId: row.context_id,
    status: row.status,
    updatedAt: row.updated_at
  }));
}

export async function listConversationMessages(
  admin: SupabaseClient,
  ctx: PatientContext,
  conversationId: string,
  opts: { limit?: number }
): Promise<unknown[]> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  
  // Verify ownership
  const { data: conv } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("patient_id", ctx.patientId)
    .single();
    
  if (!conv) {
     const err = new Error("Conversation not found");
     (err as Error & { code: string }).code = "NOT_FOUND";
     throw err;
  }

  // Fetch messages
  const { data, error } = await admin
    .from("messages")
    .select(`
      id,
      sender_type,
      body,
      created_at,
      message_attachments(id, file_name, mime_type, file_objects(storage_object_key))
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return Promise.all((data ?? []).map(async (row: any) => {
    const attachments = await Promise.all((row.message_attachments ?? []).map(async (att: any) => {
        return {
           id: att.id,
           fileName: att.file_name,
           mimeType: att.mime_type,
           url: await signedObjectUrl(att.file_objects?.storage_object_key)
        };
    }));
    
    return {
      id: row.id,
      senderType: row.sender_type,
      body: row.body,
      createdAt: row.created_at,
      attachments
    };
  }));
}

export async function sendConversationMessage(
  admin: SupabaseClient,
  ctx: PatientContext,
  conversationId: string,
  body: { body: string; attachmentMediaObjectIds?: string[] }
): Promise<{ id: string; createdAt: string }> {
  const trimmed = body.body.trim();
  if (!trimmed && !(body.attachmentMediaObjectIds?.length)) {
    const err = new Error("Message body or attachment is required");
    (err as Error & { code: string }).code = "VALIDATION_ERROR";
    throw err;
  }

  // Verify ownership
  const { data: conv } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("patient_id", ctx.patientId)
    .single();
    
  if (!conv) {
     const err = new Error("Conversation not found");
     (err as Error & { code: string }).code = "NOT_FOUND";
     throw err;
  }

  if (body.attachmentMediaObjectIds?.length) {
    const { data: media } = await admin
      .from("media_objects")
      .select("id")
      .in("id", body.attachmentMediaObjectIds)
      .eq("patient_id", ctx.patientId)
      .eq("clinic_id", ctx.clinicId);
    if ((media ?? []).length !== body.attachmentMediaObjectIds.length) {
      const err = new Error("Invalid attachment");
      (err as Error & { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }
  }

  const { data, error } = await admin
    .from("messages")
    .insert({
      id: uuid(),
      conversation_id: conversationId,
      body: trimmed,
      sender_type: "PATIENT",
      sender_id: ctx.authUserId
    })
    .select("id,created_at")
    .single();

  if (error) throw error;
  const row = data as { id: string; created_at: string };
  
  // Attachments logic here (Phase 2 enhancement: link media objects to message_attachments)
  if (body.attachmentMediaObjectIds?.length) {
      const attachments = body.attachmentMediaObjectIds.map(fid => ({
          message_id: row.id,
          file_object_id: fid
      }));
      await admin.from("message_attachments").insert(attachments);
  }

  return { id: row.id, createdAt: row.created_at };
}

export async function createConversation(
  admin: SupabaseClient,
  ctx: PatientContext,
  contextType: string = "GENERAL"
): Promise<{ id: string }> {
  const { data, error } = await admin
    .from("conversations")
    .insert({
       clinic_id: ctx.clinicId,
       patient_id: ctx.patientId,
       context_type: contextType
    })
    .select("id")
    .single();
    
  if (error) throw error;
  return { id: data.id };
}
