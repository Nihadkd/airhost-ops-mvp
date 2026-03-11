import { OrderStatus, ServiceType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { handleApiError } from "@/lib/api";
import { derivePaymentStatus } from "@/lib/payments/order-payment";

type DashboardSort = "NEWEST_OLDEST" | "OLDEST_NEWEST" | "NEAREST";
type DashboardView = "active" | "my" | "completed";
type MyOrdersStatusFilter = "ongoing" | "completed" | "all";

export async function GET(req: Request) {
  try {
    const session = await requireAuth();
    const url = new URL(req.url);
    const pageRaw = Number(url.searchParams.get("page") ?? "1");
    const pageSizeRaw = Number(url.searchParams.get("pageSize") ?? "20");
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(50, Math.max(10, Math.floor(pageSizeRaw))) : 20;
    const search = url.searchParams.get("search")?.trim();
    const dateParam = url.searchParams.get("date")?.trim();
    const sortParam = url.searchParams.get("sort");
    const viewParam = url.searchParams.get("view");
    const statusParam = url.searchParams.get("status");
    const sort: DashboardSort =
      sortParam === "OLDEST_NEWEST" || sortParam === "NEAREST" ? sortParam : "NEWEST_OLDEST";
    const view: DashboardView = viewParam === "completed" ? "completed" : viewParam === "my" ? "my" : "active";
    const myStatus: MyOrdersStatusFilter =
      statusParam === "ongoing" || statusParam === "completed" ? statusParam : "all";

    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const myStatusWhere =
      myStatus === "ongoing"
        ? { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] }
        : myStatus === "completed"
          ? OrderStatus.COMPLETED
          : { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED] };

    const visibilityWhere =
      isAdmin
        ? view === "completed"
          ? { status: OrderStatus.COMPLETED }
        : view === "my"
            ? { status: myStatusWhere }
            : { status: OrderStatus.PENDING, assignedToId: null }
        : session.user.role === "UTLEIER"
          ? {
              landlordId: session.user.id,
              ...(view === "completed"
                ? { status: OrderStatus.COMPLETED }
                : view === "my"
                  ? { status: myStatusWhere }
                  : { status: OrderStatus.PENDING, assignedToId: null }),
            }
          : view === "completed"
            ? { assignedToId: session.user.id, status: OrderStatus.COMPLETED }
            : view === "my"
              ? { assignedToId: session.user.id, status: myStatusWhere }
              : { assignedToId: null, status: OrderStatus.PENDING };

    const searchWhere = search
      ? {
          OR: [
            { address: { contains: search, mode: "insensitive" as const } },
            { note: { contains: search, mode: "insensitive" as const } },
            { landlord: { name: { contains: search, mode: "insensitive" as const } } },
            { assignedTo: { name: { contains: search, mode: "insensitive" as const } } },
            ...(Object.values(ServiceType).includes(search.toUpperCase() as ServiceType)
              ? [{ type: search.toUpperCase() as ServiceType }]
              : []),
            ...(Number.isFinite(Number(search)) ? [{ orderNumber: Number(search) }] : []),
          ],
        }
      : null;

    const where = searchWhere ? { AND: [visibilityWhere, searchWhere] } : visibilityWhere;
    const dateWhere =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? {
            date: {
              gte: new Date(`${dateParam}T00:00:00.000Z`),
              lt: new Date(`${dateParam}T23:59:59.999Z`),
            },
          }
        : null;
    const whereWithDate = dateWhere
      ? searchWhere
        ? { AND: [visibilityWhere, searchWhere, dateWhere] }
        : { AND: [visibilityWhere, dateWhere] }
      : where;
    const forceWorkerMyOrdersByDate =
      !isAdmin && session.user.role === "TJENESTE" && view === "my";
    const orderBy = forceWorkerMyOrdersByDate
      ? [{ date: "asc" as const }, { createdAt: "asc" as const }]
      : sort === "OLDEST_NEWEST"
        ? { createdAt: "asc" as const }
        : sort === "NEAREST"
          ? { date: "asc" as const }
          : { createdAt: "desc" as const };

    const totalPromise = prisma.serviceOrder.count({ where: whereWithDate });

    const ordersPromise = prisma.serviceOrder.findMany({
      where: whereWithDate,
      include: {
        landlord: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        receipt: { select: { amountNok: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        type: row.type,
        address: row.address,
        status: row.status,
        date: row.date,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        assignedToId: row.assignedToId,
        landlord: row.landlord,
        assignedTo: row.assignedTo,
        paymentStatus: derivePaymentStatus({
          paymentIntent: row.paymentIntent,
          receiptAmountNok: row.receipt?.amountNok ?? null,
        }),
      })),
    );

    const statsPromise =
      isAdmin
        ? Promise.all([
            prisma.serviceOrder.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
            prisma.serviceOrder.count({ where: { status: "IN_PROGRESS" } }),
            prisma.serviceOrder.count({ where: { status: "COMPLETED" } }),
            prisma.user.count({ where: { role: "UTLEIER", isActive: true } }),
            prisma.user.count({ where: { role: "TJENESTE", isActive: true } }),
          ]).then(([activeOrders, inProgressOrders, completedOrders, landlords, workers]) => ({
            activeOrders,
            inProgressOrders,
            completedOrders,
            landlords,
            workers,
          }))
        : Promise.resolve(null);

    const [orders, stats, total] = await Promise.all([ordersPromise, statsPromise, totalPromise]);

    return NextResponse.json({
      me: { effectiveRole: isAdmin ? "ADMIN" : session.user.role },
      orders,
      stats,
      filters: {
        search: search ?? "",
        date: dateParam ?? "",
        sort,
        view,
        status: myStatus,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
