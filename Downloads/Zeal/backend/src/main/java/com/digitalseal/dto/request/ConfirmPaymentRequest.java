package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(description = "Confirm payment for an order")
public class ConfirmPaymentRequest {
    
    @NotBlank(message = "Payment transaction hash is required")
    @Schema(description = "Blockchain transaction hash of the payment", example = "0xabc123...")
    private String paymentTxHash;
}
