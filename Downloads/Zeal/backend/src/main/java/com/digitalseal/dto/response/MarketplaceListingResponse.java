package com.digitalseal.dto.response;

import com.digitalseal.model.entity.ProductCategory;
import com.digitalseal.model.entity.ProductStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Marketplace listing response — simplified product view for buyers")
public class MarketplaceListingResponse {
    
    @Schema(description = "Product ID", example = "A1B2C3")
    private String id;
    
    @Schema(description = "Product name", example = "Louis Vuitton Speedy 30")
    private String productName;
    
    @Schema(description = "Short description", example = "Iconic monogram canvas handbag")
    private String description;
    
    @Schema(description = "Product image URL")
    private String imageUrl;
    
    @Schema(description = "Product category", example = "HANDBAG")
    private ProductCategory category;
    
    @Schema(description = "Price per unit", example = "0.5")
    private BigDecimal price;
    
    @Schema(description = "Available quantity for purchase", example = "85")
    private Integer availableQuantity;
    
    @Schema(description = "Total quantity", example = "100")
    private Integer totalQuantity;
    
    @Schema(description = "Brand ID")
    private Long brandId;
    
    @Schema(description = "Brand name", example = "Louis Vuitton")
    private String brandName;
    
    @Schema(description = "Brand logo URL")
    private String brandLogo;
    
    @Schema(description = "Collection name (if any)")
    private String collectionName;
    
    @Schema(description = "Product status", example = "LISTED")
    private ProductStatus status;
    
    @Schema(description = "When product was listed")
    private LocalDateTime listedAt;
    
    @Schema(description = "Listing deadline (if any)")
    private LocalDateTime listingDeadline;
    
    @Schema(description = "Whether the product is verified (brand is verified)")
    private Boolean brandVerified;
}
