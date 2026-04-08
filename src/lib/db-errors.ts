import { Prisma } from "@prisma/client";

const DB_HINT =
  "Database is missing or unreachable. Set DATABASE_URL and DIRECT_URL (Supabase pooler + direct URI) and run `prisma migrate deploy`.";

export function databaseErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { message: DB_HINT, status: 503 as const };
  }
  const msg = error instanceof Error ? error.message : String(error);
  if (
    /DATABASE_URL|Can't reach database server|P1001|P1017|ECONNREFUSED|getaddrinfo/i.test(
      msg
    )
  ) {
    return { message: DB_HINT, status: 503 as const };
  }
  return null;
}
