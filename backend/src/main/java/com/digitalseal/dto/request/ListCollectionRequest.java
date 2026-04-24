package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Schema(description = "Mint-and-list collection request payload")
public class ListCollectionRequest {

    @NotNull(message = "Sales end date/time is required")
    @Future(message = "Sales end date/time must be in the future")
    @Schema(description = "Sales end datetime for this collection", example = "2026-05-15T23:59:59")
    private LocalDateTime salesEndAt;
}
