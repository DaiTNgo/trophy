FROM alpine
COPY . /app
RUN ls -la /app/test_ignore/node_modules
