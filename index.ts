import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { nanoid } from "nanoid";
import { createClient } from "redis";

const PORT = parseInt(process.env.PORT || "3000");
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const redis = createClient({ url: REDIS_URL });

redis.on("error", (err) => {
  console.log("Redis Error", err);
});

const app = new Hono();

// middleware for handling errors
app.use("*", async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error("Error: ", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

app.post("/shorten", async (c) => {
  try {
    const body = await c.req.json();
    const longUrl = body.url;

    if (!longUrl) {
      return c.json({ error: "URL is required" }, 400);
    }

    const shortId = nanoid(7);
    const shortUrl = `${BASE_URL}/${shortId}`;

    await redis.set(shortId, longUrl);

    return c.json({
      original_url: longUrl,
      short_url: shortUrl,
      short_id: shortId,
    });
  } catch (error) {
    console.error("Error shortening URL: ", error);
    return c.json({ error: "Error shortening the URL" }, 500);
  }
});

app.get("/:shortId", async (c) => {
  const shortId = c.req.param("shortId");

  // Lookup the original URL in Redis
  const longUrl = await redis.get(shortId);

  if (!longUrl) {
    return c.json({ error: "Short URL not found" }, 404);
  }

  // Redirect to the original URL
  return c.redirect(longUrl);
});

// Start Redis connection
async function startServer() {
  await redis.connect();
  console.log("Connected to Redis");
}

startServer().catch((error) => {
  console.error("Error starting server: ", error);
  process.exit(1);
});

// Export the app for Bun
export default {
  port: PORT,
  fetch: app.fetch,
};
