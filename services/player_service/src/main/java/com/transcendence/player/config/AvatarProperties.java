package com.transcendence.player.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Component
@ConfigurationProperties(prefix = "avatar")
@Getter
@Setter
public class AvatarProperties {

    @NotBlank
    private String uploadDir;

    @NotBlank
    private String baseUrl;

    private long maxSize;
}
