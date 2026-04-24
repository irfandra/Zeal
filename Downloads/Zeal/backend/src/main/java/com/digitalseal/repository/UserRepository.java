package com.digitalseal.repository;

import com.digitalseal.model.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByWalletAddress(String walletAddress);

    Optional<User> findByWalletAddressIgnoreCase(String walletAddress);
    
    Boolean existsByEmail(String email);
    
    Boolean existsByWalletAddress(String walletAddress);

    Boolean existsByWalletAddressIgnoreCase(String walletAddress);

    Boolean existsByWalletAddressIgnoreCaseAndIdNot(String walletAddress, Long id);

    @Query("""
            SELECT u FROM User u
            WHERE u.walletAddress IS NOT NULL
                AND LOWER(TRIM(u.walletAddress)) IN :wallets
            """)
    List<User> findByNormalizedWalletAddressIn(@Param("wallets") List<String> wallets);

    @Query("""
            SELECT u FROM User u
            WHERE u.isActive = true
                AND u.id <> :excludedUserId
                AND u.walletAddress IS NOT NULL
                AND LENGTH(TRIM(u.walletAddress)) > 0
            ORDER BY COALESCE(u.userName, u.email) ASC
            """)
    List<User> findActiveTransferRecipientsExcludingUserId(@Param("excludedUserId") Long excludedUserId);
}
