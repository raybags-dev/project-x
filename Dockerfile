FROM node:14

WORKDIR /ray-project-x

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5001

CMD [ "npm", "run", "start" ]
