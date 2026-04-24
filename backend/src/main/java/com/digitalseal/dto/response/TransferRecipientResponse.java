package com.digitalseal.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Transfer recipient option")
public class TransferRecipientResponse {

    @Schema(description = "User ID", example = "12")
    private Long id;

    @Schema(description = "Username", example = "collector_demo")
    private String userName;

    @Schema(description = "Display name for recipient picker", example = "Collector Demo")
    private String displayName;

    @Schema(description = "Recipient wallet address", example = "0x742d35cc6634c0532925a3b844bc9e7595f0beb")
    private String walletAddress;
}