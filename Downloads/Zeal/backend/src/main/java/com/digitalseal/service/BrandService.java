package com.digitalseal.service;

import com.digitalseal.dto.request.CreateBrandRequest;
import com.digitalseal.dto.request.UpdateBrandRequest;
import com.digitalseal.dto.response.BrandResponse;
import com.digitalseal.exception.UserAlreadyExistsException;
import com.digitalseal.model.entity.Brand;
import com.digitalseal.model.entity.User;
import com.digitalseal.model.entity.UserRole;
import com.digitalseal.repository.BrandRepository;
import com.digitalseal.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class BrandService {
    
    private final BrandRepository brandRepository;
    private final UserRepository userRepository;
    
    
    @Transactional
    public BrandResponse createBrand(Long userId, CreateBrandRequest request) {
        User user = findUserById(userId);
        String normalizedCompanyWallet = normalizeWalletAddress(request.getCompanyWalletAddress());

        if (brandRepository.existsByBrandNameIgnoreCase(request.getBrandName())) {
            throw new UserAlreadyExistsException("Brand name already taken");
        }

        if (!normalizedCompanyWallet.isBlank()
                && (brandRepository.existsByCompanyWalletAddressIgnoreCase(normalizedCompanyWallet)
                || userRepository.existsByWalletAddressIgnoreCase(normalizedCompanyWallet))) {
            throw new UserAlreadyExistsException("Company wallet address already registered to another account");
        }
        
        Brand brand = Brand.builder()
                .user(user)
                .brandName(request.getBrandName())
                .companyEmail(request.getCompanyEmail())
                .companyAddress(request.getCompanyAddress())
                .companyWalletAddress(normalizedCompanyWallet)
                .logo(request.getLogo())
            .companyBanner(request.getCompanyBanner())
            .statementLetterUrl(request.getStatementLetterUrl())
            .personInChargeName(request.getPersonInChargeName())
            .personInChargeRole(request.getPersonInChargeRole())
            .personInChargeEmail(request.getPersonInChargeEmail())
            .personInChargePhone(request.getPersonInChargePhone())
                .description(request.getDescription())
                .verified(false)
                .build();
        
        Brand savedBrand = brandRepository.save(brand);
        log.info("Brand '{}' created by user ID: {}", savedBrand.getBrandName(), userId);

        if (user.getRole() == UserRole.OWNER) {
            user.setRole(UserRole.BRAND);
            userRepository.save(user);
            log.info("User ID: {} role upgraded to BRAND", userId);
        }
        
        return mapToBrandResponse(savedBrand);
    }
    
    
    public List<BrandResponse> getMyBrands(Long userId) {
        User user = findUserById(userId);
        return brandRepository.findByUser(user).stream()
                .map(this::mapToBrandResponse)
                .collect(Collectors.toList());
    }

    
    public List<BrandResponse> getAllBrands() {
        return brandRepository.findAllByOrderByBrandNameAsc().stream()
                .filter(brand -> Boolean.TRUE.equals(brand.getVerified()))
                .map(this::mapToBrandResponse)
                .collect(Collectors.toList());
    }
    
    
    public BrandResponse getBrandById(Long brandId) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new RuntimeException("Brand not found"));
        return mapToBrandResponse(brand);
    }
    
    
    @Transactional
    public BrandResponse updateBrand(Long userId, Long brandId, UpdateBrandRequest request) {
        User user = findUserById(userId);
        
        Brand brand = brandRepository.findByIdAndUser(brandId, user)
                .orElseThrow(() -> new RuntimeException("Brand not found or you don't own this brand"));
        
        if (request.getBrandName() != null) {

            if (!brand.getBrandName().equalsIgnoreCase(request.getBrandName()) && 
                brandRepository.existsByBrandNameIgnoreCase(request.getBrandName())) {
                throw new UserAlreadyExistsException("Brand name already taken");
            }
            brand.setBrandName(request.getBrandName());
        }
        
        if (request.getCompanyEmail() != null) {
            brand.setCompanyEmail(request.getCompanyEmail());
        }
        
        if (request.getCompanyAddress() != null) {
            brand.setCompanyAddress(request.getCompanyAddress());
        }
        
        if (request.getCompanyWalletAddress() != null) {
            String normalizedCompanyWallet = normalizeWalletAddress(request.getCompanyWalletAddress());
            String currentWallet = normalizeWalletAddress(brand.getCompanyWalletAddress());

            if (!normalizedCompanyWallet.equals(currentWallet)
                    && (brandRepository.existsByCompanyWalletAddressIgnoreCaseAndIdNot(normalizedCompanyWallet, brand.getId())
                    || userRepository.existsByWalletAddressIgnoreCase(normalizedCompanyWallet))) {
                throw new UserAlreadyExistsException("Company wallet address already registered to another account");
            }
            brand.setCompanyWalletAddress(normalizedCompanyWallet);
        }
        
        if (request.getLogo() != null) {
            brand.setLogo(request.getLogo());
        }

        if (request.getCompanyBanner() != null) {
            brand.setCompanyBanner(request.getCompanyBanner());
        }

        if (request.getStatementLetterUrl() != null) {
            brand.setStatementLetterUrl(request.getStatementLetterUrl());
        }

        if (request.getPersonInChargeName() != null) {
            brand.setPersonInChargeName(request.getPersonInChargeName());
        }

        if (request.getPersonInChargeRole() != null) {
            brand.setPersonInChargeRole(request.getPersonInChargeRole());
        }

        if (request.getPersonInChargeEmail() != null) {
            brand.setPersonInChargeEmail(request.getPersonInChargeEmail());
        }

        if (request.getPersonInChargePhone() != null) {
            brand.setPersonInChargePhone(request.getPersonInChargePhone());
        }
        
        if (request.getDescription() != null) {
            brand.setDescription(request.getDescription());
        }
        
        Brand updatedBrand = brandRepository.save(brand);
        log.info("Brand '{}' updated by user ID: {}", updatedBrand.getBrandName(), userId);
        
        return mapToBrandResponse(updatedBrand);
    }
    
    
    @Transactional
    public void deleteBrand(Long userId, Long brandId) {
        User user = findUserById(userId);
        
        Brand brand = brandRepository.findByIdAndUser(brandId, user)
                .orElseThrow(() -> new RuntimeException("Brand not found or you don't own this brand"));
        
        brandRepository.delete(brand);
        log.info("Brand '{}' deleted by user ID: {}", brand.getBrandName(), userId);

        List<Brand> remainingBrands = brandRepository.findByUser(user);
        if (remainingBrands.isEmpty()) {
            user.setRole(UserRole.OWNER);
            userRepository.save(user);
            log.info("User ID: {} role reverted to OWNER (no brands remaining)", userId);
        }
    }
    
    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private String normalizeWalletAddress(String walletAddress) {
        return String.valueOf(walletAddress == null ? "" : walletAddress).trim().toLowerCase();
    }
    
    private BrandResponse mapToBrandResponse(Brand brand) {
        String ownerName = "";
        if (brand.getUser().getFirstName() != null) {
            ownerName = brand.getUser().getFirstName();
        }
        if (brand.getUser().getLastName() != null) {
            ownerName = ownerName.isEmpty() ? brand.getUser().getLastName() 
                    : ownerName + " " + brand.getUser().getLastName();
        }
        
        return BrandResponse.builder()
                .id(brand.getId())
                .brandName(brand.getBrandName())
                .companyEmail(brand.getCompanyEmail())
                .companyAddress(brand.getCompanyAddress())
                .companyWalletAddress(brand.getCompanyWalletAddress())
                .logo(brand.getLogo())
                .companyBanner(brand.getCompanyBanner())
                .statementLetterUrl(brand.getStatementLetterUrl())
                .personInChargeName(brand.getPersonInChargeName())
                .personInChargeRole(brand.getPersonInChargeRole())
                .personInChargeEmail(brand.getPersonInChargeEmail())
                .personInChargePhone(brand.getPersonInChargePhone())
                .description(brand.getDescription())
                .verified(brand.getVerified())
                .ownerId(brand.getUser().getId())
                .ownerName(ownerName.isEmpty() ? null : ownerName)
                .createdAt(brand.getCreatedAt())
                .updatedAt(brand.getUpdatedAt())
                .build();
    }
}
