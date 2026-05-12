import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Min 6 caractères").max(100),
});

export const signupSchema = authSchema.extend({
  confirm: z.string(),
  ville: z.string().min(1, "Ville requise"),
}).refine(d => d.password === d.confirm, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm"],
});

export const demandeSchema = z.object({
  titre: z.string().min(3, "Min 3 caractères").max(80, "Max 80 caractères"),
  description: z.string().max(500, "Max 500 caractères").optional(),
  selectedType: z.string().min(1, "Type requis"),
  villeForm: z.string().min(1, "Ville requise"),
  prix: z.string().optional(),
  gratuit: z.boolean(),
  urgent: z.boolean(),
  duree: z.string().optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(2000, "Message trop long"),
});

export const profileSchema = z.object({
  pseudo: z.string().max(30, "Max 30 caractères").optional(),
  bio: z.string().max(200, "Max 200 caractères").optional(),
  ville: z.string().max(100).optional(),
  adresse: z.string().max(200).optional(),
});

export const avisSchema = z.object({
  note: z.number().min(1).max(5),
  commentaire: z.string().max(500, "Max 500 caractères").optional(),
});