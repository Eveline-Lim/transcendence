package com.transcendence.player.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FriendListResponse {
    private List<FriendResponse> friends;
    private PaginationResponse pagination;
}
