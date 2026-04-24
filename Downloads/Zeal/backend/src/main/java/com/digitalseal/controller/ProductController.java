package com.digitalseal.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.digitalseal.dto.request.CreateProductRequest;
import com.digitalseal.dto.request.PremintProductRequest;
import com.digitalseal.dto.request.PublishProductRequest;
import com.digitalseal.dto.request.UpdateProductRequest;
import com.digitalseal.dto.response.ApiResponse;
import com.digitalseal.dto.response.ProductItemResponse;
import com.digitalseal.dto.response.ProductResponse;
import com.digitalseal.model.entity.ProductCategory;
import com.digitalseal.model.entity.ProductStatus;
import com.digitalseal.service.ProductItemService;
import com.digitalseal.service.ProductService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
@Tag(name = "Product", description = "Product management, lifecycle, and verification endpoints")
public class ProductController {
    
    private final ProductService productService;
    private final ProductItemService productItemService;
    
    @Operation(summary = "Register a new product", description = "Creates a new product under a brand with DRAFT status.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/brands/{brandId}/products")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            Authentication authentication,
            @PathVariable Long brandId,
            @Valid @RequestBody CreateProductRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        ProductResponse response = productService.createProduct(userId, brandId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Product created successfully"));
    }
    
    @Operation(summary = "Get products for a brand", description = "Returns all products for a brand with optional filters.")
    @GetMapping("/brands/{brandId}/products")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProductsByBrand(
            @PathVariable Long brandId,
            @Parameter(description = "Filter by category") @RequestParam(required = false) ProductCategory category,
            @Parameter(description = "Filter by status") @RequestParam(required = false) ProductStatus status) {
        List<ProductResponse> products = productService.getProductsByBrand(brandId, category, status);
        return ResponseEntity.ok(ApiResponse.success(products, "Products retrieved successfully"));
    }
    
    @Operation(summary = "Update a product", description = "DRAFT: all fields editable. PUBLISHED: only price and quantity.")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/brands/{brandId}/products/{productId}")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable String productId,
            @Valid @RequestBody UpdateProductRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        ProductResponse response = productService.updateProduct(userId, brandId, productId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Product updated successfully"));
    }
    
    @Operation(summary = "Delete a product", description = "Only DRAFT products can be deleted.")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/brands/{brandId}/products/{productId}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable String productId) {
        Long userId = Long.parseLong(authentication.getName());
        productService.deleteProduct(userId, brandId, productId);
        return ResponseEntity.ok(ApiResponse.success(null, "Product deleted successfully"));
    }



    
    @Operation(summary = "Publish a product", description = "DRAFT → PUBLISHED. Locks core details and sets final price.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/brands/{brandId}/products/{productId}/publish")
    public ResponseEntity<ApiResponse<ProductResponse>> publishProduct(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable String productId,
            @Valid @RequestBody PublishProductRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        ProductResponse response = productService.publishProduct(userId, brandId, productId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Product published successfully"));
    }
    
    @Operation(summary = "Prepare product items", description = "PUBLISHED → PREMINTED. Creates unique off-chain product-item rows. NFT/QR are generated when collection is listed.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/brands/{brandId}/products/{productId}/premint")
    public ResponseEntity<ApiResponse<ProductResponse>> premintProduct(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable String productId,
            @Valid @RequestBody PremintProductRequest request) {
        Long userId = Long.parseLong(authentication.getName());
        ProductResponse response = productService.premintProduct(userId, brandId, productId, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Product items prepared successfully"));
    }
    
    @Operation(summary = "List product on marketplace", description = "PREMINTED → LISTED. Makes product available for purchase.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/brands/{brandId}/products/{productId}/list")
    public ResponseEntity<ApiResponse<ProductResponse>> listProduct(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable String productId) {
        Long userId = Long.parseLong(authentication.getName());
        ProductResponse response = productService.listProduct(userId, brandId, productId);
        return ResponseEntity.ok(ApiResponse.success(response, "Product listed on marketplace"));
    }
    
    @Operation(summary = "Delist product from marketplace", description = "LISTED/SOLD_OUT → DELISTED.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/brands/{brandId}/products/{productId}/delist")
    public ResponseEntity<ApiResponse<ProductResponse>> delistProduct(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable String productId) {
        Long userId = Long.parseLong(authentication.getName());
        ProductResponse response = productService.delistProduct(userId, brandId, productId);
        return ResponseEntity.ok(ApiResponse.success(response, "Product delisted from marketplace"));
    }
    
    @Operation(summary = "Archive a product", description = "COMPLETED/DELISTED → ARCHIVED.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/brands/{brandId}/products/{productId}/archive")
    public ResponseEntity<ApiResponse<ProductResponse>> archiveProduct(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable String productId) {
        Long userId = Long.parseLong(authentication.getName());
        ProductResponse response = productService.archiveProduct(userId, brandId, productId);
        return ResponseEntity.ok(ApiResponse.success(response, "Product archived"));
    }



    
    @Operation(summary = "Get all items for a product", description = "Returns individual NFT items for a product. Brand owner only.")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/brands/{brandId}/products/{productId}/items")
    public ResponseEntity<ApiResponse<List<ProductItemResponse>>> getProductItems(
            Authentication authentication,
            @PathVariable Long brandId,
            @PathVariable String productId) {
        if (authentication != null) {
            try {
                Long userId = Long.parseLong(authentication.getName());
                productService.verifyBrandOwnership(userId, brandId);
            } catch (NumberFormatException ignored) {

            }
        }
        List<ProductItemResponse> items = productItemService.getItemsByProduct(productId);
        return ResponseEntity.ok(ApiResponse.success(items, "Product items retrieved"));
    }



    
    @Operation(summary = "Get product by ID", description = "Publicly accessible.")
    @GetMapping("/products/{productId}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProduct(@PathVariable String productId) {
        ProductResponse response = productService.getProductById(productId);
        return ResponseEntity.ok(ApiResponse.success(response, "Product retrieved successfully"));
    }
    
    @Operation(summary = "Get products in a collection", description = "Publicly accessible.")
    @GetMapping("/collections/{collectionId}/products")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProductsByCollection(@PathVariable Long collectionId) {
        List<ProductResponse> products = productService.getProductsByCollection(collectionId);
        return ResponseEntity.ok(ApiResponse.success(products, "Products retrieved successfully"));
    }

    @Operation(summary = "Get product items by product ID", description = "Publicly accessible. Returns per-item serials sorted by item index.")
    @GetMapping("/products/{productId}/items")
    public ResponseEntity<ApiResponse<List<ProductItemResponse>>> getPublicProductItems(
            @PathVariable String productId) {
        List<ProductItemResponse> items = productItemService.getPublicPurchasableItemsByProduct(productId);
        return ResponseEntity.ok(ApiResponse.success(items, "Product items retrieved successfully"));
    }
    
    @Operation(summary = "Get all product categories", description = "Publicly accessible.")
    @GetMapping("/products/categories")
    public ResponseEntity<ApiResponse<ProductCategory[]>> getCategories() {
        ProductCategory[] categories = productService.getCategories();
        return ResponseEntity.ok(ApiResponse.success(categories, "Categories retrieved successfully"));
    }
}
