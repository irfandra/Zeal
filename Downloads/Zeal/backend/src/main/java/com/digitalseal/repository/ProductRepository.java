package com.digitalseal.repository;

import com.digitalseal.model.entity.Product;
import com.digitalseal.model.entity.ProductCategory;
import com.digitalseal.model.entity.ProductStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    
    List<Product> findByBrandId(Long brandId);
    
    List<Product> findByBrandIdAndCategory(Long brandId, ProductCategory category);
    
    List<Product> findByBrandIdAndStatus(Long brandId, ProductStatus status);
    
    List<Product> findByBrandIdAndCategoryAndStatus(Long brandId, ProductCategory category, ProductStatus status);
    
    List<Product> findByCollectionId(Long collectionId);
    
    Optional<Product> findByProductCodeAndBrandId(String productCode, Long brandId);

    Optional<Product> findByProductCode(String productCode);

    Boolean existsByProductCode(String productCode);
    
    long countByCollectionId(Long collectionId);

    @Query("SELECT p FROM Product p WHERE p.status = 'LISTED' "
        + "AND (p.listingDeadline IS NULL OR p.listingDeadline > CURRENT_TIMESTAMP) "
        + "AND (p.collection IS NULL OR p.collection.salesEndAt IS NULL OR p.collection.salesEndAt > CURRENT_TIMESTAMP) "
        + "AND EXISTS (SELECT pi.id FROM ProductItem pi WHERE pi.product = p AND pi.sealStatus = 'PRE_MINTED') "
        + "ORDER BY p.listedAt DESC")
    Page<Product> findListedProducts(Pageable pageable);
    
    @Query("SELECT p FROM Product p WHERE p.status = 'LISTED' AND p.category = :category "
        + "AND (p.listingDeadline IS NULL OR p.listingDeadline > CURRENT_TIMESTAMP) "
        + "AND (p.collection IS NULL OR p.collection.salesEndAt IS NULL OR p.collection.salesEndAt > CURRENT_TIMESTAMP) "
        + "AND EXISTS (SELECT pi.id FROM ProductItem pi WHERE pi.product = p AND pi.sealStatus = 'PRE_MINTED') "
        + "ORDER BY p.listedAt DESC")
    Page<Product> findListedProductsByCategory(@Param("category") ProductCategory category, Pageable pageable);
    
    @Query("SELECT p FROM Product p WHERE p.status = 'LISTED' AND p.brand.id = :brandId "
        + "AND (p.listingDeadline IS NULL OR p.listingDeadline > CURRENT_TIMESTAMP) "
        + "AND (p.collection IS NULL OR p.collection.salesEndAt IS NULL OR p.collection.salesEndAt > CURRENT_TIMESTAMP) "
        + "AND EXISTS (SELECT pi.id FROM ProductItem pi WHERE pi.product = p AND pi.sealStatus = 'PRE_MINTED') "
        + "ORDER BY p.listedAt DESC")
    Page<Product> findListedProductsByBrand(@Param("brandId") Long brandId, Pageable pageable);
    
    @Query("SELECT p FROM Product p WHERE p.status = 'LISTED' "
        + "AND LOWER(p.productName) LIKE LOWER(CONCAT('%', :query, '%')) "
        + "AND (p.listingDeadline IS NULL OR p.listingDeadline > CURRENT_TIMESTAMP) "
        + "AND (p.collection IS NULL OR p.collection.salesEndAt IS NULL OR p.collection.salesEndAt > CURRENT_TIMESTAMP) "
        + "AND EXISTS (SELECT pi.id FROM ProductItem pi WHERE pi.product = p AND pi.sealStatus = 'PRE_MINTED') "
        + "ORDER BY p.listedAt DESC")
    Page<Product> searchListedProducts(@Param("query") String query, Pageable pageable);
}
