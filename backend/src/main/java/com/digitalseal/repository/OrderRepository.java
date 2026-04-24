package com.digitalseal.repository;

import com.digitalseal.model.entity.Order;
import com.digitalseal.model.entity.OrderStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    Optional<Order> findByOrderNumber(String orderNumber);
    
    List<Order> findByBuyerId(Long buyerId);
    
    Page<Order> findByBuyerId(Long buyerId, Pageable pageable);
    
    List<Order> findByBuyerIdAndStatus(Long buyerId, OrderStatus status);
    
    List<Order> findByProductId(Long productId);
    
    Page<Order> findByProductId(Long productId, Pageable pageable);

    Page<Order> findByProductProductCode(String productCode, Pageable pageable);
    
    List<Order> findByProductIdAndStatus(Long productId, OrderStatus status);

    List<Order> findByProductProductCodeAndStatus(String productCode, OrderStatus status);
    
    Optional<Order> findByProductItemId(Long productItemId);

    Optional<Order> findByProductItemIdAndStatusIn(Long productItemId, List<OrderStatus> statuses);
    
    Optional<Order> findByIdAndBuyerId(Long id, Long buyerId);
    
    long countByProductId(Long productId);
    
    long countByBuyerId(Long buyerId);
    
    long countByProductIdAndStatus(Long productId, OrderStatus status);
    
    Boolean existsByOrderNumber(String orderNumber);
}
