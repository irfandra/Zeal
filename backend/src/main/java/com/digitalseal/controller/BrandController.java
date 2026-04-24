package com.digitalseal.controller;

import com.digitalseal.dto.request.CreateBrandRequest;
import com.digitalseal.dto.request.UpdateBrandRequest;
import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.dto.response.BrandResponse;
import com.digitalseal.service.BrandService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/brands")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@Tag(name = "Brand", description = "Brand management endpoints")
public class BrandController {
    
    private final BrandService brandService;
    
    @Operation(
            summary = "Register a new brand",
            description = "Creates a new brand under the authenticated user. Automatically upgrades user role to BRAND if currently OWNER."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "201",
                    description = "Brand created successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid input data"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "409",
                    description = "Brand name or wallet already exists"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping
    public ResponseEntity<ApiResponse<BrandResponse>> createBrand(
            Authentication authentication,
            @Valid @RequestBody CreateBrandRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Brand registration request from user ID: {}", userId);
        BrandResponse response = brandService.createBrand(userId, request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Brand created successfully"));
    }
    
    @Operation(
            summary = "Get my brands",
            description = "Returns all brands owned by the authenticated user."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Brands retrieved successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Unauthorized"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<BrandResponse>>> getMyBrands(Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());
        List<BrandResponse> brands = brandService.getMyBrands(userId);
        return ResponseEntity.ok(ApiResponse.success(brands, "Brands retrieved successfully"));
    }

    @Operation(
            summary = "Get all brands",
            description = "Returns all registered brands. Publicly accessible."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Brands retrieved successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            )
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<BrandResponse>>> getAllBrands() {
        List<BrandResponse> brands = brandService.getAllBrands();
        return ResponseEntity.ok(ApiResponse.success(brands, "Brands retrieved successfully"));
    }
    
    @Operation(
            summary = "Get brand by ID",
            description = "Returns a specific brand by its ID. This endpoint is publicly accessible."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Brand retrieved successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Brand not found"
            )
    })
    @GetMapping("/{brandId}")
    public ResponseEntity<ApiResponse<BrandResponse>> getBrandById(@PathVariable Long brandId) {
        BrandResponse response = brandService.getBrandById(brandId);
        return ResponseEntity.ok(ApiResponse.success(response, "Brand retrieved successfully"));
    }
    
    @Operation(
            summary = "Update brand",
            description = "Updates brand details. Only the brand owner can update. Only provided fields will be updated."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Brand updated successfully",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid input data"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Not the owner of this brand"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Brand not found"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/{brandId}")
    public ResponseEntity<ApiResponse<BrandResponse>> updateBrand(
            Authentication authentication,
            @PathVariable Long brandId,
            @Valid @RequestBody UpdateBrandRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Brand update request for brand ID: {} from user ID: {}", brandId, userId);
        BrandResponse response = brandService.updateBrand(userId, brandId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Brand updated successfully"));
    }
    
    @Operation(
            summary = "Delete brand",
            description = "Deletes a brand. Only the brand owner can delete. If no brands remain, user role reverts to OWNER."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Brand deleted successfully"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Not the owner of this brand"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "404",
                    description = "Brand not found"
            )
    })
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{brandId}")
    public ResponseEntity<ApiResponse<Void>> deleteBrand(
            Authentication authentication,
            @PathVariable Long brandId) {
        Long userId = Long.parseLong(authentication.getName());
        log.info("Brand delete request for brand ID: {} from user ID: {}", brandId, userId);
        brandService.deleteBrand(userId, brandId);
        return ResponseEntity.ok(ApiResponse.success(null, "Brand deleted successfully"));
    }
}
