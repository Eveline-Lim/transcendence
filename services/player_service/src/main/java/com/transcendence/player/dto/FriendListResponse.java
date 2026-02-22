package com.transcendence.player.dto;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FriendListResponse {
    private List<FriendResponse> friends;
    private PaginationResponse pagination;
}
