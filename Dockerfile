# ─── Development Dockerfile for NestJS ───────────────────────────────────────
FROM node:20-alpine


WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate --schema=prisma/schema

# Copy the rest of the source
COPY . .

EXPOSE 8080

# Start in dev mode with hot-reload
CMD ["npm", "run", "start:dev"]