package com.digitalseal.repository;

import com.digitalseal.model.entity.ProductItem;
import com.digitalseal.model.entity.SealStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

@Repository
public interface ProductItemRepository extends JpaRepository<ProductItem, Long> {

    interface ProductItemCountProjection {
        Long getProductId();
        Long getTotalQuantity();
        Long getAvailableQuantity();
    }
    
    List<ProductItem> findByProductId(Long productId);

    List<ProductItem> findByProductProductCode(String productCode);

    List<ProductItem> findByProductProductCodeOrderByItemIndexAsc(String productCode);

    List<ProductItem> findByProductProductCodeAndSealStatusOrderByItemIndexAsc(String productCode, SealStatus sealStatus);

    List<ProductItem> findByProductIdAndSealStatus(Long productId, SealStatus sealStatus);
    
    Optional<ProductItem> findByItemSerial(String itemSerial);
    
    Optional<ProductItem> findByTokenId(Long tokenId);
    
    Optional<ProductItem> findByClaimCode(String claimCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT pi FROM ProductItem pi WHERE pi.id = :itemId")
    Optional<ProductItem> findByIdForUpdate(@Param("itemId") Long itemId);
    
    Optional<ProductItem> findByIdAndProductId(Long id, Long productId);
    
    List<ProductItem> findByCurrentOwnerId(Long userId);
    
    long countByProductId(Long productId);
    
    long countByProductIdAndSealStatus(Long productId, SealStatus sealStatus);

        @Query("""
            SELECT pi.product.id AS productId,
               COUNT(pi.id) AS totalQuantity,
               SUM(CASE WHEN pi.sealStatus = :availableStatus THEN 1 ELSE 0 END) AS availableQuantity
            FROM ProductItem pi
            WHERE pi.product.id IN :productIds
            GROUP BY pi.product.id
            """)
        List<ProductItemCountProjection> countStatsByProductIds(
            @Param("productIds") List<Long> productIds,
            @Param("availableStatus") SealStatus availableStatus
        );
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT pi FROM ProductItem pi WHERE pi.product.id = :productId AND pi.sealStatus = 'PRE_MINTED' ORDER BY pi.itemIndex ASC")
    List<ProductItem> findAvailableItemsForUpdate(@Param("productId") Long productId, Pageable pageable);

    @Query("""
            SELECT pi
            FROM ProductItem pi
            JOIN FETCH pi.product p
            LEFT JOIN FETCH p.collection c
            WHERE p.brand.id = :brandId
                AND (:collectionId IS NULL OR c.id = :collectionId)
            ORDER BY p.id ASC, pi.itemIndex ASC
            """)
    List<ProductItem> findBrandItemsForQrEmail(
            @Param("brandId") Long brandId,
            @Param("collectionId") Long collectionId
    );

    default Optional<ProductItem> findFirstAvailableItemForUpdate(Long productId) {
        return findAvailableItemsForUpdate(productId, PageRequest.of(0, 1)).stream().findFirst();
    }
}
