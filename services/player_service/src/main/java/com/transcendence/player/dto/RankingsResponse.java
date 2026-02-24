package com.transcendence.player.dto;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RankingsResponse {
    private List<PlayerRankingResponse> rankings;
    private PaginationResponse pagination;
    private Integer currentPlayerRank;
}
