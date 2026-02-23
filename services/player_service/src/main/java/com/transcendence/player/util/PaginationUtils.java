package com.transcendence.player.util;

import org.springframework.data.domain.Page;

import com.transcendence.player.dto.PaginationResponse;

public final class PaginationUtils {

    private PaginationUtils() {
    }

    public static PaginationResponse buildPagination(Page<?> page) {
        return PaginationResponse.builder()
                .page(page.getNumber() + 1)
                .limit(page.getSize())
                .total(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }
}
