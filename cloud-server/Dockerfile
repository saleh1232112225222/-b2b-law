FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache postgresql16-client
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vitest.config.ts* ./
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache postgresql16-client
RUN addgroup --system app && adduser --system --ingroup app app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/uploads /app/logs && chown -R app:app /app
USER app
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
