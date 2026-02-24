package com.transcendence.player.dto;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlayerListResponse {
    private List<PublicPlayerResponse> players;
    private PaginationResponse pagination;
}
