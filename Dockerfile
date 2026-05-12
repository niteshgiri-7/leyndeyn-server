FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma first and generate
COPY prisma ./prisma
RUN npx prisma generate --schema=prisma/schema

# Copy rest of app
COPY . .

EXPOSE 8080

CMD ["npm", "run", "start:dev"]