FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
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
