import { Role, ServiceType } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
  password: z.string().min(8),
  role: z.enum(["UTLEIER", "TJENESTE", "BEGGE"]).optional(),
});

export const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(6).max(30).optional(),
  mobileNotifications: z.boolean().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

export const meProfileUpdateSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(6).max(30).optional().or(z.literal("")),
});

export const modeSwitchSchema = z.object({
  mode: z.enum(["ADMIN", "UTLEIER", "TJENESTE"]),
});

export const orderCreateSchema = z.object({
  type: z.nativeEnum(ServiceType),
  address: z.string().min(3),
  date: z.string().datetime(),
  note: z.string().max(500).optional(),
  guestCount: z.number().int().min(1).max(50).optional(),
  landlordId: z.string().min(1).optional(),
});

export const orderUpdateSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
  type: z.nativeEnum(ServiceType).optional(),
  address: z.string().min(3).optional(),
  date: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
  guestCount: z.number().int().min(1).max(50).nullable().optional(),
  completionNote: z.string().max(1000).optional(),
  completionChecklist: z
    .object({
      bedReady: z.boolean(),
      bathroomClean: z.boolean(),
      kitchenClean: z.boolean(),
      floorsVacuumed: z.boolean(),
      trashHandled: z.boolean(),
      keysHandled: z.boolean(),
      towelsPrepared: z.boolean(),
      suppliesRefilled: z.boolean(),
      allRoomsPhotographed: z.boolean(),
    })
    .optional(),
});

export const assignSchema = z.object({
  assignedToId: z.string().min(1),
});

export const orderIdParamSchema = z.object({
  id: z.string().min(1),
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
  actorUserId: z.string().min(1).optional(),
  targetUrl: z.string().min(1).max(300).optional(),
});

export const messageCreateSchema = z.object({
  text: z.string().min(1).max(1000),
});

export const reviewCreateSchema = z.object({
  workerId: z.string().min(1),
  orderId: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(2).max(500),
});

export const contactUserSchema = z.object({
  message: z.string().min(2).max(500),
});

export const pushTokenSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(["ios", "android", "web"]).optional(),
  deviceName: z.string().min(1).max(120).optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
