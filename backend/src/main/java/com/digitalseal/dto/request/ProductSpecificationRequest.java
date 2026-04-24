package com.digitalseal.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Single product specification entry")
public class ProductSpecificationRequest {

    @Size(max = 120, message = "Specification aspect must not exceed 120 characters")
    @Schema(description = "Specification aspect", example = "Size")
    private String aspect;

    @Size(max = 255, message = "Specification details must not exceed 255 characters")
    @Schema(description = "Specification details", example = "30cm")
    private String details;
}