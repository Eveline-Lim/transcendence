package com.transcendence.player.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaginationResponse {
    private int page;
    private int limit;
    private long total;
    private int totalPages;
    private boolean hasNext;
    private boolean hasPrevious;
}
