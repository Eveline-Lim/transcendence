package com.transcendence.player.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MatchHistoryResponse {
    private List<MatchRecordResponse> matches;
    private PaginationResponse pagination;
}
