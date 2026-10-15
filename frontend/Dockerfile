FROM node:20-alpine

WORKDIR /app

# Copy package definitions and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose Vite development port
EXPOSE 5173

# Run Vite dev server bound to 0.0.0.0 so container port forwarding works
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
