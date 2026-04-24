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
@Schema(description = "Product specification entry")
public class ProductSpecificationResponse {

    @Schema(description = "Specification aspect", example = "Size")
    private String aspect;

    @Schema(description = "Specification details", example = "30cm")
    private String details;
}