import "dotenv/config";
import http from "node:http";
import next from "next";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function start(): Promise<void> {
	try {
		await app.prepare();

		http
			.createServer((req, res) => {
				void handle(req, res);
			})
			.listen(port, hostname, () => {
				console.log(`[Server] Ready on http://${hostname}:${port}`);
			});
	} catch (error) {
		console.error("[Server] Failed to start:", error);
		process.exit(1);
	}
}

void start();
