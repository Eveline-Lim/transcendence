package com.transcendence.player;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;

/**
 * Shared PostgreSQL container reused by all tests in the same JVM.
 * Declared in a base class so Testcontainers reuses the single instance.
 */
public abstract class AbstractIntegrationTest {

        @Container
        @ServiceConnection
        static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
                        .withDatabaseName("transcendence_test")
                        .withUsername("test")
                        .withPassword("test");
}
