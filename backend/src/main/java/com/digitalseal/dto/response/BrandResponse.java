package com.digitalseal.dto.response;

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
@Schema(description = "Brand information response")
public class BrandResponse {
    
    @Schema(description = "Brand's unique identifier", example = "1")
    private Long id;
    
    @Schema(description = "Brand name", example = "Louis Vuitton")
    private String brandName;
    
    @Schema(description = "Company email address", example = "contact@louisvuitton.com")
    private String companyEmail;
    
    @Schema(description = "Company physical address", example = "2 Rue du Pont Neuf, Paris, France")
    private String companyAddress;
    
    @Schema(description = "Company Ethereum wallet address", example = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
    private String companyWalletAddress;
    
    @Schema(description = "Brand logo URL", example = "https://example.com/logo.png")
    private String logo;

    @Schema(description = "Company banner URL", example = "https://example.com/banner.png")
    private String companyBanner;

    @Schema(description = "Signed statement letter URL (PDF)", example = "https://example.com/statement-letter.pdf")
    private String statementLetterUrl;

    @Schema(description = "Person in charge full name", example = "Gerry Julian")
    private String personInChargeName;

    @Schema(description = "Person in charge role in company", example = "Chief Operating Officer")
    private String personInChargeRole;

    @Schema(description = "Person in charge email", example = "gerry@louisvuitton.com")
    private String personInChargeEmail;

    @Schema(description = "Person in charge phone number", example = "+62 812 3456 7890")
    private String personInChargePhone;
    
    @Schema(description = "Brand description", example = "French luxury fashion house founded in 1854")
    private String description;
    
    @Schema(description = "Whether the brand is verified", example = "false")
    private Boolean verified;
    
    @Schema(description = "Brand owner's user ID", example = "1")
    private Long ownerId;
    
    @Schema(description = "Brand owner's name", example = "John Doe")
    private String ownerName;
    
    @Schema(description = "Brand creation timestamp", example = "2026-02-16T10:30:00")
    private LocalDateTime createdAt;
    
    @Schema(description = "Brand last update timestamp", example = "2026-02-16T15:45:30")
    private LocalDateTime updatedAt;
}
