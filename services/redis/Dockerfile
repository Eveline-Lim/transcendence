FROM redis:7-alpine

RUN addgroup -S -g 1001 red \
	&& adduser -S -u 1001 -G red red

RUN mkdir -p /data \
	&& chown -R red:red /data

USER red

CMD ["redis-server", "--protected-mode", "no"]
