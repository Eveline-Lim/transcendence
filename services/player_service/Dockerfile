FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21 AS jre-build
RUN $JAVA_HOME/bin/jlink \
    --add-modules java.base,java.logging,java.xml,java.sql,java.naming,java.desktop,\
java.management,java.management.rmi,java.rmi,java.security.jgss,java.security.sasl,\
java.instrument,java.net.http,jdk.unsupported,jdk.crypto.ec,jdk.crypto.cryptoki,\
jdk.naming.dns,jdk.naming.rmi,jdk.jfr \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=2 \
    --output /jre

FROM alpine:3.19
ENV JAVA_HOME=/jre
ENV PATH="$JAVA_HOME/bin:$PATH"
WORKDIR /app
COPY --from=jre-build /jre /jre
COPY --from=build /app/target/*.jar app.jar
COPY entrypoint.sh /app/entrypoint.sh
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && apk add --no-cache curl \
    && mkdir -p /app/uploads/avatars \
    && chown -R appuser:appgroup /app/uploads/avatars \
    && chmod 770 /app/uploads/avatars \
    && chmod +x /app/entrypoint.sh
USER appuser
EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
