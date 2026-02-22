package com.transcendence.player.dto;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LeaderboardResponse {
    private List<LeaderboardEntryResponse> entries;
    private PaginationResponse pagination;
    private Integer currentPlayerRank;
}
