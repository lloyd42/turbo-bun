import { Elysia, t } from "elysia";

import { swagger } from "@elysiajs/swagger";

import { opentelemetry, record } from "@elysiajs/opentelemetry";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";

export const app = new Elysia()
  .use(
    opentelemetry({
      spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
    })
  )
  .use(swagger())
  .get("/", () => "hello world")
  .post(
    "/",
    ({ body: { username } }) => {
      return record("username.post", () => {
        return username;
      });
    },
    {
      body: t.Object({
        username: t.String(),
      }),
    }
  )
  .listen(process.env.PORT ?? 3001);

export type App = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
