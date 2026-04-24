package com.digitalseal.repository;

import com.digitalseal.model.entity.TransferRequest;
import com.digitalseal.model.entity.TransferRequestStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TransferRequestRepository extends JpaRepository<TransferRequest, Long> {

    @Query("""
            SELECT tr
            FROM TransferRequest tr
            JOIN FETCH tr.productItem pi
            JOIN FETCH pi.product p
            JOIN FETCH p.brand b
            JOIN FETCH tr.fromUser fu
            JOIN FETCH tr.toUser tu
            WHERE tr.id = :requestId
            """)
    Optional<TransferRequest> findByIdWithDetails(@Param("requestId") Long requestId);

    @Query("""
            SELECT tr
            FROM TransferRequest tr
            JOIN FETCH tr.productItem pi
            JOIN FETCH pi.product p
            JOIN FETCH p.brand b
            JOIN FETCH tr.fromUser fu
            JOIN FETCH tr.toUser tu
            WHERE tr.toUser.id = :userId
              AND tr.status = :status
            ORDER BY tr.requestedAt DESC
            """)
    List<TransferRequest> findIncomingByUserIdAndStatus(
            @Param("userId") Long userId,
            @Param("status") TransferRequestStatus status
    );

    @Query("""
            SELECT tr
            FROM TransferRequest tr
            JOIN FETCH tr.productItem pi
            JOIN FETCH pi.product p
            JOIN FETCH p.brand b
            JOIN FETCH tr.fromUser fu
            JOIN FETCH tr.toUser tu
            WHERE tr.fromUser.id = :userId
            ORDER BY tr.requestedAt DESC
            """)
    List<TransferRequest> findOutgoingByUserId(@Param("userId") Long userId);

    boolean existsByProductItemIdAndToUserIdAndStatus(Long productItemId, Long toUserId, TransferRequestStatus status);

    List<TransferRequest> findByProductItemIdAndStatus(Long productItemId, TransferRequestStatus status);
}
