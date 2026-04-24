package com.digitalseal.dto.request;

import java.math.BigDecimal;
import java.util.List;

import com.digitalseal.model.entity.ProductCategory;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import lombok.Data;

@Data
@Schema(description = "Create product request payload")
public class CreateProductRequest {
    
    @NotBlank(message = "Product name is required")
    @Size(min = 2, max = 255, message = "Product name must be between 2 and 255 characters")
    @Schema(description = "Product name", example = "Louis Vuitton Speedy 30")
    private String productName;
    
    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    @Schema(description = "Product description", example = "Iconic monogram canvas handbag")
    private String description;
    
    @NotNull(message = "Category is required")
    @Schema(description = "Product category", example = "HANDBAG")
    private ProductCategory category;
    
    @Schema(description = "Product image URL", example = "https://example.com/product.png")
    private String imageUrl;
    
    @Schema(description = "Collection ID to assign this product to (optional)", example = "1")
    private Long collectionId;
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    @Digits(integer = 10, fraction = 8, message = "Invalid price format")
    @Schema(description = "Price per unit", example = "0.5")
    private BigDecimal price;

    @Valid
    @Schema(description = "Variation-specific product specifications")
    private List<ProductSpecificationRequest> specifications;
}
