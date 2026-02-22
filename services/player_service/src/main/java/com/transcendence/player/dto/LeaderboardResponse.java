package com.transcendence.player.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LeaderboardResponse {
    private List<LeaderboardEntryResponse> entries;
    private PaginationResponse pagination;
    private Integer currentPlayerRank;
}
