import { Role, ServiceType } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["UTLEIER", "TJENESTE", "BEGGE"]).optional(),
});

export const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

export const modeSwitchSchema = z.object({
  mode: z.enum(["UTLEIER", "TJENESTE"]),
});

export const orderCreateSchema = z.object({
  type: z.nativeEnum(ServiceType),
  address: z.string().min(3),
  date: z.string().datetime(),
  note: z.string().max(500).optional(),
});

export const orderUpdateSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
  address: z.string().min(3).optional(),
  date: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

export const assignSchema = z.object({
  assignedToId: z.string().min(1),
});

export const imageCreateSchema = z.object({
  orderId: z.string().min(1),
  url: z.string().url(),
  caption: z.string().max(200).optional(),
  kind: z.enum(["before", "after"]).optional(),
});

export const commentCreateSchema = z.object({
  imageId: z.string().min(1),
  text: z.string().min(1).max(300),
});

export const notificationCreateSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1).max(240),
});