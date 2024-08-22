import { treaty } from "@elysiajs/eden";
import type { App } from "server";

export const app = treaty<App>("http://localhost:3000/api");

// const { data, error } = await app.index.get();
