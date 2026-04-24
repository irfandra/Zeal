package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Schema(description = "Publish product request — finalize product details before pre-minting")
public class PublishProductRequest {
    
    @NotNull(message = "Price is required to publish")
    @Schema(description = "Price per unit", example = "0.5")
    private BigDecimal price;
    
    @Schema(description = "Optional listing deadline", example = "2026-06-01T00:00:00")
    private LocalDateTime listingDeadline;
}
