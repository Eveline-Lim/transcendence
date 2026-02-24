package com.transcendence.player.dto;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MatchHistoryResponse {
    private List<MatchRecordResponse> matches;
    private PaginationResponse pagination;
}
