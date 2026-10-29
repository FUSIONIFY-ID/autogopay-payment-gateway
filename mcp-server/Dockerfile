FROM node:22-alpine
WORKDIR /app
COPY mcp-server/package*.json ./mcp-server/
RUN npm ci --prefix mcp-server --ignore-scripts --omit=dev
COPY mcp-server/*.mjs ./mcp-server/
COPY skills/autogopay-payment-gateway ./skills/autogopay-payment-gateway
USER node
ENV HOST=0.0.0.0 PORT=8787
EXPOSE 8787
CMD ["node", "mcp-server/http.mjs"]
