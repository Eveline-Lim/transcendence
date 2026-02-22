package com.transcendence.player.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RankingsResponse {
    private List<PlayerRankingResponse> rankings;
    private PaginationResponse pagination;
    private Integer currentPlayerRank;
}
