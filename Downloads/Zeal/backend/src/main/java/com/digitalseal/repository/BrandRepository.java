package com.digitalseal.repository;

import com.digitalseal.model.entity.Brand;
import com.digitalseal.model.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BrandRepository extends JpaRepository<Brand, Long> {

    List<Brand> findAllByOrderByBrandNameAsc();
    
    List<Brand> findByUser(User user);
    
    Optional<Brand> findByIdAndUser(Long id, User user);
    
    Boolean existsByBrandNameIgnoreCase(String brandName);
    
    Boolean existsByCompanyWalletAddress(String companyWalletAddress);

    Boolean existsByCompanyWalletAddressIgnoreCase(String companyWalletAddress);

    Boolean existsByCompanyWalletAddressIgnoreCaseAndIdNot(String companyWalletAddress, Long id);
}
