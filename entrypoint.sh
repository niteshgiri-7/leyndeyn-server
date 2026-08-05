#!/bin/sh
# Exit immediately if a command exits with a non-zero status
set -e 

echo "🔄 Running Prisma production migrations..."

# Apply pending migrations to the database
npx prisma migrate deploy

echo "✅ Migrations completed successfully!"
echo "🚀 Starting NestJS application..."

# Execute the CMD from the Dockerfile (node dist/main)
exec "$@"