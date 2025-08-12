# --- Build Stage ---
    FROM node:22-alpine AS builder

    WORKDIR /app
    
    COPY package*.json /app/
    RUN npm ci --legacy-peer-deps
    
    COPY . .

    RUN npm run build
    
    # --- Final Stage ---
    FROM node:22-alpine

    
    WORKDIR /
    
    COPY --from=builder /app/dist /dist
    COPY --from=builder /app/package*.json /


    RUN npm ci 
    
    EXPOSE 4600
    
    CMD ["node", "dist/main.js"]