#!/bin/bash

echo "🚀 FixRevOps Client Portal - Setup Script"
echo "=========================================="
echo ""

# Check if .env exists and has DATABASE_URL
if ! grep -q "^DATABASE_URL=" .env; then
  echo "❌ DATABASE_URL not set in .env"
  echo ""
  echo "Choose your database setup:"
  echo "1. Vercel Postgres (recommended for deploy)"
  echo "2. Local Postgres"
  echo "3. Skip for now"
  echo ""
  read -p "Enter choice (1-3): " db_choice

  case $db_choice in
    1)
      echo ""
      echo "📦 To set up Vercel Postgres:"
      echo "1. Go to https://vercel.com/dashboard"
      echo "2. Create a new Postgres database"
      echo "3. Copy the DATABASE_URL to .env"
      echo ""
      ;;
    2)
      echo ""
      echo "📦 For local Postgres, set DATABASE_URL in .env:"
      echo "DATABASE_URL=\"postgresql://user:password@localhost:5432/client-portal\""
      echo ""
      ;;
    3)
      echo "Skipping database setup"
      ;;
  esac
else
  echo "✅ DATABASE_URL found"
fi

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push schema to database (if DATABASE_URL is set)
if grep -q "^DATABASE_URL=" .env && ! grep -q 'DATABASE_URL=""' .env; then
  echo ""
  echo "📊 Pushing schema to database..."
  npx prisma db push --accept-data-loss
  echo "✅ Database schema pushed!"
else
  echo ""
  echo "⚠️  Skipping db push - DATABASE_URL not configured"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set DATABASE_URL in .env (if not done)"
echo "2. Run 'npm run dev' to start development server"
echo "3. Open http://localhost:3000/admin"
echo ""
