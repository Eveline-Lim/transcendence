FROM nginx:alpine

RUN apk add --no-cache curl

RUN addgroup -S nonroot \
	&& adduser -S nonroot -G nonroot

COPY conf/default.conf /etc/nginx/conf.d/default.conf

USER nonroot

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
	CMD curl -f http://localhost/health || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]