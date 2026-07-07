FROM node:20-alpine

WORKDIR /app

# Install system dependencies needed for node-gyp or other build steps
RUN apk add --no-cache libc6-compat openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "run", "dev"]
