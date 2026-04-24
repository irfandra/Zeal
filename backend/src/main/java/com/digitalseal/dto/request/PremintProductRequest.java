package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "Pre-mint request payload")
public class PremintProductRequest {

    @NotNull(message = "Mint quantity is required")
    @Min(value = 1, message = "Mint quantity must be at least 1")
    @Schema(description = "Number of product items to pre-mint", example = "100")
    private Integer quantity;
}
