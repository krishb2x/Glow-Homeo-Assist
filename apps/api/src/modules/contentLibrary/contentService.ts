import type { SupabaseClient } from "@supabase/supabase-js";
import { ContentCourseInputSchema, ContentModuleInputSchema, ContentLessonInputSchema } from "@homeoassist/domain";

type Db = SupabaseClient;

export async function listCourses(db: Db, clinicId: string) {
  const { data, error } = await db
    .from("content_courses")
    .select("id, title, description, thumbnail_url, status, created_at, updated_at, doctor_id")
    .or(`clinic_id.eq.${clinicId},and(clinic_id.eq.00000000-0000-0000-0000-000000000000,status.eq.published)`)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  
  return (data ?? []).map((c: any) => ({
    ...c,
    is_official: c.clinic_id === "00000000-0000-0000-0000-000000000000"
  }));
}

export async function getCourseDetail(db: Db, courseId: string) {
  const { data: course, error: cErr } = await db
    .from("content_courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!course) return null;

  const { data: modules, error: mErr } = await db
    .from("content_modules")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });
  if (mErr) throw mErr;

  const moduleIds = (modules ?? []).map((m: any) => m.id);
  let lessons: any[] = [];
  if (moduleIds.length > 0) {
    const { data: l, error: lErr } = await db
      .from("content_lessons")
      .select("*")
      .in("module_id", moduleIds)
      .order("sort_order", { ascending: true });
    if (lErr) throw lErr;
    lessons = l ?? [];
  }

  const modulesWithLessons = (modules ?? []).map((m: any) => ({
    id: m.id,
    title: m.title,
    sortOrder: m.sort_order,
    lessons: lessons
      .filter((l: any) => l.module_id === m.id)
      .map((l: any) => ({
        id: l.id,
        title: l.title,
        contentType: l.content_type,
        contentPayload: l.content_payload,
        sortOrder: l.sort_order,
        isPreview: l.is_preview
      }))
  }));

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    thumbnailUrl: course.thumbnail_url,
    status: course.status,
    isOfficial: course.clinic_id === "00000000-0000-0000-0000-000000000000",
    modules: modulesWithLessons
  };
}

export async function createCourse(db: Db, clinicId: string, doctorId: string, body: unknown) {
  const parsed = ContentCourseInputSchema.parse(body);
  const { data, error } = await db
    .from("content_courses")
    .insert({
      clinic_id: clinicId,
      doctor_id: doctorId,
      title: parsed.title,
      description: parsed.description,
      thumbnail_url: parsed.thumbnailUrl,
      status: parsed.status
    })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCourse(db: Db, courseId: string, body: unknown) {
  const parsed = ContentCourseInputSchema.partial().parse(body);
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.description !== undefined) updates.description = parsed.description;
  if (parsed.thumbnailUrl !== undefined) updates.thumbnail_url = parsed.thumbnailUrl;
  if (parsed.status !== undefined) updates.status = parsed.status;

  const { error } = await db.from("content_courses").update(updates).eq("id", courseId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteCourse(db: Db, courseId: string) {
  const { error } = await db.from("content_courses").delete().eq("id", courseId);
  if (error) throw error;
  return { ok: true };
}

export async function addModule(db: Db, courseId: string, body: unknown) {
  const parsed = ContentModuleInputSchema.parse(body);
  const { data, error } = await db
    .from("content_modules")
    .insert({
      course_id: courseId,
      title: parsed.title,
      sort_order: parsed.sortOrder ?? 0
    })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateModule(db: Db, moduleId: string, body: unknown) {
  const parsed = ContentModuleInputSchema.partial().parse(body);
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.sortOrder !== undefined) updates.sort_order = parsed.sortOrder;

  const { error } = await db.from("content_modules").update(updates).eq("id", moduleId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteModule(db: Db, moduleId: string) {
  const { error } = await db.from("content_modules").delete().eq("id", moduleId);
  if (error) throw error;
  return { ok: true };
}

export async function addLesson(db: Db, moduleId: string, body: unknown) {
  const parsed = ContentLessonInputSchema.parse(body);
  const { data, error } = await db
    .from("content_lessons")
    .insert({
      module_id: moduleId,
      title: parsed.title,
      content_type: parsed.contentType,
      content_payload: parsed.contentPayload,
      sort_order: parsed.sortOrder ?? 0,
      is_preview: parsed.isPreview ?? false
    })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateLesson(db: Db, lessonId: string, body: unknown) {
  const parsed = ContentLessonInputSchema.partial().parse(body);
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.contentType !== undefined) updates.content_type = parsed.contentType;
  if (parsed.contentPayload !== undefined) updates.content_payload = parsed.contentPayload;
  if (parsed.sortOrder !== undefined) updates.sort_order = parsed.sortOrder;
  if (parsed.isPreview !== undefined) updates.is_preview = parsed.isPreview;

  const { error } = await db.from("content_lessons").update(updates).eq("id", lessonId);
  if (error) throw error;
  return { ok: true };
}

export async function deleteLesson(db: Db, lessonId: string) {
  const { error } = await db.from("content_lessons").delete().eq("id", lessonId);
  if (error) throw error;
  return { ok: true };
}

export async function cloneCourse(
  db: Db,
  clinicId: string,
  doctorId: string,
  sourceCourseId: string,
  newTitle?: string
) {
  // Fetch original course
  const original = await getCourseDetail(db, sourceCourseId);
  if (!original) return null;

  // 1. Create new course
  const title = newTitle ?? `${original.title} (Copy)`;
  const { data: newCourse, error: cErr } = await db
    .from("content_courses")
    .insert({
      clinic_id: clinicId,
      doctor_id: doctorId,
      title: title.substring(0, 200),
      description: original.description,
      thumbnail_url: original.thumbnailUrl,
      status: "draft",
      is_official: false
    })
    .select("id")
    .maybeSingle();
  if (cErr) throw cErr;
  if (!newCourse) return null;

  const newCourseId = newCourse.id;

  // 2. Clone modules & lessons
  for (const mod of original.modules) {
    const { data: newMod, error: mErr } = await db
      .from("content_modules")
      .insert({
        course_id: newCourseId,
        title: mod.title,
        sort_order: mod.sortOrder
      })
      .select("id")
      .maybeSingle();
    
    if (mErr) throw mErr;
    if (!newMod) continue;

    for (const les of mod.lessons) {
      await db.from("content_lessons").insert({
        module_id: newMod.id,
        title: les.title,
        content_type: les.contentType,
        content_payload: les.contentPayload,
        sort_order: les.sortOrder,
        is_preview: les.isPreview
      });
    }
  }

  return { id: newCourseId };
}
