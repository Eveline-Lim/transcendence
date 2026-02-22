package com.transcendence.player.security;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class GatewayAuthenticationFilter extends OncePerRequestFilter {

    private static final String USER_ID_HEADER = "X-User-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String userIdHeader = request.getHeader(USER_ID_HEADER);

        if (StringUtils.hasText(userIdHeader)) {
            try {
                UUID playerId = UUID.fromString(userIdHeader);
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(playerId, null,
                        List.of());
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (IllegalArgumentException e) {
                // Invalid UUID format, ignore or log
            }
        }

        filterChain.doFilter(request, response);
    }
}
