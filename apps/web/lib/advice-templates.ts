const STORAGE_KEY = "ha_advice_templates_v1";

export type AdviceCategory = "diet" | "lifestyle" | "restriction";

export type AdviceTemplate = {
  id: string;
  title: string;
  category: AdviceCategory;
  content: string;
  isBuiltin?: boolean;
};

export const BUILTIN_TEMPLATES: AdviceTemplate[] = [
  {
    id: "b1",
    title: "Light vegetarian diet",
    category: "diet",
    content:
      "Have light, easily digestible vegetarian meals. Prefer fresh fruits, vegetables, and whole grains. Avoid heavy, oily, or spicy food.",
    isBuiltin: true
  },
  {
    id: "b2",
    title: "Avoid sour & fermented foods",
    category: "restriction",
    content:
      "Avoid all sour foods — curd, pickles, vinegar, citrus fruits, and fermented items during treatment.",
    isBuiltin: true
  },
  {
    id: "b3",
    title: "Avoid coffee, tea & alcohol",
    category: "restriction",
    content:
      "Strictly avoid coffee, black tea, alcohol, and caffeinated beverages for the duration of treatment.",
    isBuiltin: true
  },
  {
    id: "b4",
    title: "Morning walk 30 min",
    category: "lifestyle",
    content:
      "30 minutes of light walking every morning in fresh air. Avoid strenuous exercise until next review.",
    isBuiltin: true
  },
  {
    id: "b5",
    title: "Sleep hygiene",
    category: "lifestyle",
    content:
      "Sleep before 10 PM. Maintain a regular sleep schedule. Avoid screens 1 hour before bedtime.",
    isBuiltin: true
  },
  {
    id: "b6",
    title: "Stress reduction",
    category: "lifestyle",
    content:
      "Practice slow, deep breathing for 10 minutes daily. Avoid unnecessary stressors. Share emotional concerns at next visit.",
    isBuiltin: true
  },
  {
    id: "b7",
    title: "Avoid non-vegetarian food",
    category: "restriction",
    content: "Avoid all non-vegetarian food, eggs, and strong-smelling foods during the course of treatment.",
    isBuiltin: true
  },
  {
    id: "b8",
    title: "Drink warm water",
    category: "lifestyle",
    content: "Drink 2–3 litres of warm or room-temperature water daily. Avoid cold drinks and ice.",
    isBuiltin: true
  }
];

export function loadAdviceTemplates(): AdviceTemplate[] {
  if (typeof window === "undefined") return [...BUILTIN_TEMPLATES];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const custom: AdviceTemplate[] = raw ? (JSON.parse(raw) as AdviceTemplate[]) : [];
    const customIds = new Set(custom.map((t) => t.id));
    return [...BUILTIN_TEMPLATES.filter((b) => !customIds.has(b.id)), ...custom];
  } catch {
    return [...BUILTIN_TEMPLATES];
  }
}

export function saveCustomAdviceTemplate(t: AdviceTemplate): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: AdviceTemplate[] = raw ? (JSON.parse(raw) as AdviceTemplate[]) : [];
    const updated = [...existing.filter((x) => x.id !== t.id), { ...t, isBuiltin: false }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    /* */
  }
}

export function deleteCustomAdviceTemplate(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: AdviceTemplate[] = raw ? (JSON.parse(raw) as AdviceTemplate[]) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((t) => t.id !== id)));
  } catch {
    /* */
  }
}
