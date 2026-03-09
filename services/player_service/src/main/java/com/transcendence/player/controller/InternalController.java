package com.transcendence.player.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transcendence.player.dto.RecordMatchRequest;
import com.transcendence.player.service.StatisticsService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Internal-only endpoints called by other services (game_service).
 * Not exposed through nginx — accessible only on the Docker network.
 */
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalController {

    private final StatisticsService statisticsService;

    @PostMapping("/match-result")
    public ResponseEntity<Void> recordMatchResult(@Valid @RequestBody RecordMatchRequest request) {
        statisticsService.recordMatch(request);
        return ResponseEntity.ok().build();
    }
}
