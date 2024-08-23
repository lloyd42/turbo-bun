import { Elysia, t } from "elysia";

import { swagger } from "@elysiajs/swagger";

import { opentelemetry, record } from "@elysiajs/opentelemetry";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { authRoutes, guardRoutes } from "./route";

export const app = new Elysia({ prefix: "/api" })
  .use(
    opentelemetry({
      spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
    })
  )
  .use(swagger())
  .get("/", () => "hello world")
  .use(authRoutes)
  .use(guardRoutes)
  .listen(process.env.PORT ?? 3001);

export type App = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
