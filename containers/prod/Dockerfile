FROM node:fermium-slim
WORKDIR /sitas-soundcloud-prod

RUN apt update
COPY src/ ./
RUN npm install

ENTRYPOINT [ "node", "soundcloud-downloader-module.js" ]