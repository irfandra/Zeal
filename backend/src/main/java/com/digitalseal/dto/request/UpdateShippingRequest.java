package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(description = "Update order shipping information")
public class UpdateShippingRequest {
    
    @NotBlank(message = "Tracking number is required")
    @Schema(description = "Shipping tracking number", example = "1Z999AA10123456784")
    private String trackingNumber;
}
