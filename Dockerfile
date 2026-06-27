# Single-stage Dockerfile for Game Services (Node.js)
FROM node:20-alpine

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

# Install sqlite dependencies for alpine
RUN apk add --no-cache sqlite

# Install Node dependencies
COPY backend-node/package*.json ./backend-node/
RUN cd backend-node && npm install --production

# Copy backend code
COPY backend-node/ ./backend-node/

# Copy the public catalog seed used only when the persistent database is empty
COPY config/catalog-seed.json ./config/catalog-seed.json

# Copy pre-built frontend
COPY dist/ ./dist/

# Copy local uploads folder (for default game images)
COPY uploads/ ./uploads/
RUN mkdir -p /app/uploads/slips

EXPOSE 3000

# Start Node.js backend
CMD ["node", "backend-node/src/server.js"]
