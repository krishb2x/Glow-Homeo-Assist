import * as z from "zod";

export const bookingFormSchema = z.object({
  // Personal Info
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number"),
  age: z.coerce.number().min(1).max(120).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  
  // Consultation Details
  type: z.enum(["initial_online", "initial_clinic", "follow_up_online", "emergency"]),
  concernCategory: z.string().min(1, "Please select a concern category"),
  concernDescription: z.string().max(1000, "Description is too long").optional(),
  
  // Scheduling (Optional initially, can be set later)
  preferredDate: z.string().optional(),
  preferredTimeSlot: z.string().optional(),
  
  // Referral Program
  referralCode: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;
