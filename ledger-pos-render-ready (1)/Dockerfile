FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY app ./app
EXPOSE 4000
CMD ["npm", "run", "start:setup"]
