package com.transcendence.player.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PlayerListResponse {
    private List<PublicPlayerResponse> players;
    private PaginationResponse pagination;
}
