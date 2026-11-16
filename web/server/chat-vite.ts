// AI-assisted: Codex (OpenAI).
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { loadEnv, type Plugin } from "vite";

export function chatDevRoute(): Plugin {
  return {
    name: "oasis-chat-dev",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir, ["GEMINI_API_KEY", "GEMINI_MODEL"]);
      server.middlewares.use("/api/chat", async (req, res) => {
        const controller = new AbortController();
        res.once("close", () => { if (!res.writableEnded) controller.abort(); });
        const headers = new Headers();
        for (let i = 0; i < req.rawHeaders.length; i += 2) headers.append(req.rawHeaders[i], req.rawHeaders[i + 1]);
        const request = new Request(`http://${req.headers.host ?? "localhost"}/api/chat`, {
          method: req.method,
          headers,
          signal: controller.signal,
          ...(req.method === "POST" ? { body: Readable.toWeb(req), duplex: "half" } : {}),
        } as RequestInit);
        try {
          const { chatResponse } = await import("./chat");
          const response = await chatResponse(request, env);
          res.writeHead(response.status, Object.fromEntries(response.headers));
          if (response.body) {
            res.flushHeaders();
            await pipeline(Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>), res);
          } else res.end();
        } catch {
          if (!res.headersSent) res.writeHead(500, { "Cache-Control": "no-store" });
          if (!res.destroyed) res.end();
        }
      });
    },
  };
}
