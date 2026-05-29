import { CarePlanTemplateBodySchema } from "@homeoassist/domain";

async function main() {
  const payload = {
    title: "New care plan",
    primaryCategory: "wellness_plan",
    status: "draft",
    blocks: []
  };

  console.log("Parsing payload against CarePlanTemplateBodySchema...");
  const parsed = CarePlanTemplateBodySchema.safeParse(payload);
  
  if (parsed.success) {
    console.log("Validation SUCCEEDED!");
  } else {
    console.error("Validation FAILED:", JSON.stringify(parsed.error.flatten(), null, 2));
  }
}

main().catch(console.error);
