#=================================================================================================
# STAGE 1 : Build ModSecurity + Connector
#=================================================================================================
FROM nginx:alpine AS builder

RUN apk add --no-cache curl \
    git build-base autoconf automake libtool \
    pcre2-dev libxml2-dev curl-dev yajl-dev \
    linux-headers openssl-dev geoip-dev

# ModSecurity
RUN git clone --depth 1 -b v3/master \
    https://github.com/owasp-modsecurity/ModSecurity /tmp/modsecurity && \
    cd /tmp/modsecurity && \
    git submodule init && git submodule update && \
    ./build.sh && ./configure && make -j$(nproc) && make install

# Copie unicode.mapping
RUN mkdir -p /etc/modsecurity && \
    (cp /tmp/modsecurity/unicode.mapping /etc/modsecurity/ 2>/dev/null || \
     cp /tmp/modsecurity/modsec/unicode.mapping /etc/modsecurity/ 2>/dev/null || \
     cp /usr/local/modsecurity/unicode.mapping /etc/modsecurity/ 2>/dev/null || \
     wget -O /etc/modsecurity/unicode.mapping \
       https://raw.githubusercontent.com/owasp-modsecurity/ModSecurity/v3/master/unicode.mapping)

# Connector nginx
RUN git clone --depth 1 \
    https://github.com/owasp-modsecurity/ModSecurity-nginx /tmp/modsec-nginx

# Nginx rebuild with ModSecurity Module
RUN NGINX_VERSION=$(nginx -v 2>&1 | sed 's/.*\///') && \
    wget https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz && \
    tar -xzf nginx-${NGINX_VERSION}.tar.gz && \
    cd nginx-${NGINX_VERSION} && \
    ./configure --with-compat --add-dynamic-module=/tmp/modsec-nginx && \
    make modules && \
    cp objs/ngx_http_modsecurity_module.so /usr/lib/nginx/modules/

# OWASP CRS rules
RUN git clone --depth 1 -b v4.0/main \
    https://github.com/coreruleset/coreruleset /tmp/crs && \
    mkdir -p /etc/modsecurity/crs && \
    cp -r /tmp/crs/rules /etc/modsecurity/crs && \
    cp /tmp/crs/crs-setup.conf.example /etc/modsecurity/crs/crs-setup.conf

#=================================================================================================
# STAGE 2 : Final image
#=================================================================================================
FROM nginx:alpine
RUN apk add --no-cache curl libxml2 yajl pcre2

# Copying build artifacts
COPY --from=builder /usr/local/modsecurity /usr/local/modsecurity
COPY --from=builder /usr/lib/nginx/modules/ngx_http_modsecurity_module.so \
                    /usr/lib/nginx/modules/
COPY --from=builder /etc/modsecurity/crs /etc/modsecurity/crs
COPY --from=builder /etc/modsecurity/unicode.mapping /etc/modsecurity/unicode.mapping

# Create the necessary folders
RUN mkdir -p	/var/log/modsecurity \
                /tmp/modsecurity/tmp \
                /tmp/modsecurity/data \
                /tmp/modsecurity/upload \
                /etc/modsecurity

# Config ModSecurity
COPY modsecurity/modsecurity.conf /etc/modsecurity/modsecurity.conf
COPY modsecurity/crs-setup.conf /etc/modsecurity/crs/crs-setup.conf

# User non-root
RUN addgroup -S nonroot && adduser -S nonroot -G nonroot && \
    chown -R	nonroot:nonroot \
                /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
                /run /var/log/modsecurity /tmp/modsecurity

# Config nginx
COPY conf/default.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]