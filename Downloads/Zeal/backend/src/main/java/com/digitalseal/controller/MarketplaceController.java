package com.digitalseal.controller;

import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.dto.response.MarketplaceListingResponse;
import com.digitalseal.model.entity.ProductCategory;
import com.digitalseal.service.MarketplaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/marketplace")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@Tag(name = "Marketplace", description = "Public marketplace browsing endpoints")
public class MarketplaceController {
    
    private final MarketplaceService marketplaceService;
    
    @Operation(summary = "Browse marketplace listings", description = "Returns paginated listed products available for purchase.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<MarketplaceListingResponse>>> browseListings(
            @Parameter(description = "Page number (0-indexed)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<MarketplaceListingResponse> listings = marketplaceService.browseListings(pageable);
        return ResponseEntity.ok(ApiResponse.success(listings, "Marketplace listings retrieved"));
    }
    
    @Operation(summary = "Browse by category", description = "Returns listed products filtered by category.")
    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<Page<MarketplaceListingResponse>>> browseByCategory(
            @PathVariable ProductCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<MarketplaceListingResponse> listings = marketplaceService.browseByCategory(category, pageable);
        return ResponseEntity.ok(ApiResponse.success(listings, "Category listings retrieved"));
    }
    
    @Operation(summary = "Browse by brand", description = "Returns listed products from a specific brand.")
    @GetMapping("/brand/{brandId}")
    public ResponseEntity<ApiResponse<Page<MarketplaceListingResponse>>> browseByBrand(
            @PathVariable Long brandId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<MarketplaceListingResponse> listings = marketplaceService.browseByBrand(brandId, pageable);
        return ResponseEntity.ok(ApiResponse.success(listings, "Brand listings retrieved"));
    }
    
    @Operation(summary = "Search marketplace", description = "Search listed products by name.")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<MarketplaceListingResponse>>> searchListings(
            @Parameter(description = "Search query") @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<MarketplaceListingResponse> listings = marketplaceService.searchListings(q, pageable);
        return ResponseEntity.ok(ApiResponse.success(listings, "Search results retrieved"));
    }
}
