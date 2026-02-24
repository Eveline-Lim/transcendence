package com.transcendence.player.config;

import java.util.Arrays;
import java.util.stream.Collectors;

import org.springframework.core.convert.converter.Converter;
import org.springframework.core.convert.converter.ConverterFactory;

public class StringToEnumConverterFactory implements ConverterFactory<String, Enum<?>> {

    @Override
    public <T extends Enum<?>> Converter<String, T> getConverter(Class<T> targetType) {
        return source -> {
            for (T constant : targetType.getEnumConstants()) {
                if (constant.name().equalsIgnoreCase(source.trim())) {
                    return constant;
                }
            }
            String allowed = Arrays.stream(targetType.getEnumConstants())
                    .map(Enum::name)
                    .collect(Collectors.joining(", "));
            throw new IllegalArgumentException(
                    "Invalid value '" + source + "'. Allowed values: " + allowed);
        };
    }
}
