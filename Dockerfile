FROM oven/bun:latest

WORKDIR /app

COPY package.json .
COPY bun.lock .

RUN bun install --production

COPY . .

ENV PORT=3000
ENV REDIS_URL="redis://redis:6379"
ENV BASE_URL="http://localhost:3000"

EXPOSE 3000

CMD ["bun", "run", "index.ts"]