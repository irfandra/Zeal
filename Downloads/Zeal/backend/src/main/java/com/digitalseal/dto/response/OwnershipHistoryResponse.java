package com.digitalseal.dto.response;

import com.digitalseal.model.entity.TransferType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Ownership history record")
public class OwnershipHistoryResponse {
    
    @Schema(description = "Record ID", example = "1")
    private Long id;
    
    @Schema(description = "Product item ID", example = "1")
    private Long productItemId;
    
    @Schema(description = "From wallet address")
    private String fromWallet;

    @Schema(description = "From username", example = "johndoe")
    private String fromUserName;
    
    @Schema(description = "To wallet address")
    private String toWallet;

    @Schema(description = "To username", example = "janedoe")
    private String toUserName;
    
    @Schema(description = "Type of transfer", example = "PURCHASE")
    private TransferType transferType;
    
    @Schema(description = "Blockchain transaction hash")
    private String txHash;
    
    @Schema(description = "Block number")
    private Long blockNumber;
    
    @Schema(description = "Notes")
    private String notes;
    
    @Schema(description = "When the transfer occurred")
    private LocalDateTime transferredAt;
}
