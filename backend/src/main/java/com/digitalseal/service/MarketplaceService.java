package com.digitalseal.service;

import com.digitalseal.dto.response.MarketplaceListingResponse;
import com.digitalseal.model.entity.Product;
import com.digitalseal.model.entity.ProductCategory;
import com.digitalseal.model.entity.SealStatus;
import com.digitalseal.repository.ProductItemRepository;
import com.digitalseal.repository.ProductRepository;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class MarketplaceService {
    
    private final ProductRepository productRepository;
    private final ProductItemRepository productItemRepository;
    
    
    public Page<MarketplaceListingResponse> browseListings(Pageable pageable) {
        return mapToListingPage(productRepository.findListedProducts(pageable));
    }
    
    
    public Page<MarketplaceListingResponse> browseByCategory(ProductCategory category, Pageable pageable) {
        return mapToListingPage(productRepository.findListedProductsByCategory(category, pageable));
    }
    
    
    public Page<MarketplaceListingResponse> browseByBrand(Long brandId, Pageable pageable) {
        return mapToListingPage(productRepository.findListedProductsByBrand(brandId, pageable));
    }
    
    
    public Page<MarketplaceListingResponse> searchListings(String query, Pageable pageable) {
        return mapToListingPage(productRepository.searchListedProducts(query, pageable));
    }

        private Page<MarketplaceListingResponse> mapToListingPage(Page<Product> productPage) {
        Map<Long, ProductCountStats> countStatsByProductId = loadCountStats(productPage.getContent());
            return productPage.map(product -> mapToListingResponse(product, countStatsByProductId));
        }

        private Map<Long, ProductCountStats> loadCountStats(List<Product> products) {
        if (products == null || products.isEmpty()) {
            return Collections.emptyMap();
        }

        List<Long> productIds = products.stream().map(Product::getId).toList();
        Map<Long, ProductCountStats> countStats = new HashMap<>();

        productItemRepository.countStatsByProductIds(productIds, SealStatus.PRE_MINTED)
            .forEach(row -> countStats.put(
                row.getProductId(),
                new ProductCountStats(
                    row.getTotalQuantity() == null ? 0L : row.getTotalQuantity(),
                    row.getAvailableQuantity() == null ? 0L : row.getAvailableQuantity()
                )
            ));

        return countStats;
        }
    
    private MarketplaceListingResponse mapToListingResponse(Product product, Map<Long, ProductCountStats> countStatsByProductId) {
        ProductCountStats stats = countStatsByProductId.getOrDefault(product.getId(), ProductCountStats.EMPTY);

        return MarketplaceListingResponse.builder()
                .id(product.getProductCode())
                .productName(product.getProductName())
                .description(product.getDescription())
                .imageUrl(product.getImageUrl())
                .category(product.getCategory())
                .price(product.getPrice())
                .availableQuantity((int) stats.availableQuantity())
                .totalQuantity((int) stats.totalQuantity())
                .brandId(product.getBrand().getId())
                .brandName(product.getBrand().getBrandName())
                .brandLogo(product.getBrand().getLogo())
                .collectionName(product.getCollection() != null ? product.getCollection().getCollectionName() : null)
                .status(product.getStatus())
                .listedAt(product.getListedAt())
                .listingDeadline(product.getListingDeadline())
                .brandVerified(product.getBrand().getVerified())
                .build();
    }

    private record ProductCountStats(long totalQuantity, long availableQuantity) {
        private static final ProductCountStats EMPTY = new ProductCountStats(0L, 0L);
    }
}
