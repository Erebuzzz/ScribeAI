import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initSocketServer } from "./server/socket";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

async function bootstrap() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Bad Request");
      return;
    }

    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  initSocketServer(server);

  server.listen(port, hostname, () => {
    // eslint-disable-next-line no-console
    console.log(`ScribeAI server running on http://${hostname}:${port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});
