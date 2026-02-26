FROM nginx:alpine

RUN apk add --no-cache curl

RUN addgroup -S nonroot \
	&& adduser -S nonroot -G nonroot \
	&& mkdir -p /var/cache/nginx /var/log/nginx \
	&& touch /run/nginx.pid \
	&& chown -R nonroot:nonroot /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /run/nginx.pid

COPY conf/default.conf /etc/nginx/conf.d/default.conf

USER nonroot

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
	CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080 8443

CMD ["nginx", "-g", "daemon off;"]