package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Update brand request payload")
public class UpdateBrandRequest {
    
    @Size(min = 2, max = 255, message = "Brand name must be between 2 and 255 characters")
    @Schema(description = "Brand name", example = "Louis Vuitton")
    private String brandName;
    
    @Email(message = "Invalid company email format")
    @Schema(description = "Company email address", example = "contact@louisvuitton.com")
    private String companyEmail;
    
    @Schema(description = "Company physical address", example = "2 Rue du Pont Neuf, Paris, France")
    private String companyAddress;
    
    @Pattern(regexp = "^0x[a-fA-F0-9]{40}$", message = "Invalid Ethereum address format")
    @Schema(description = "Company Ethereum wallet address (optional)", example = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
    private String companyWalletAddress;
    
    @Schema(description = "Brand logo URL", example = "https://example.com/logo.png")
    private String logo;

    @Schema(description = "Company banner URL", example = "https://example.com/banner.png")
    private String companyBanner;

    @Schema(description = "Signed statement letter URL (PDF)", example = "https://example.com/statement-letter.pdf")
    private String statementLetterUrl;

    @Size(max = 255, message = "Person in charge name must not exceed 255 characters")
    @Schema(description = "Person in charge full name", example = "Gerry Julian")
    private String personInChargeName;

    @Size(max = 255, message = "Person in charge role must not exceed 255 characters")
    @Schema(description = "Person in charge role in company", example = "Chief Operating Officer")
    private String personInChargeRole;

    @Email(message = "Invalid person in charge email format")
    @Schema(description = "Person in charge email", example = "gerry@louisvuitton.com")
    private String personInChargeEmail;

    @Pattern(regexp = "^[0-9+()\\-\\s]{7,30}$", message = "Invalid phone number format")
    @Schema(description = "Person in charge phone number", example = "+62 812 3456 7890")
    private String personInChargePhone;
    
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    @Schema(description = "Brand description", example = "French luxury fashion house founded in 1854")
    private String description;
}
