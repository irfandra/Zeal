package com.digitalseal.service;

import com.digitalseal.dto.request.ChangePasswordRequest;
import com.digitalseal.dto.request.ConnectWalletRequest;
import com.digitalseal.dto.request.UpdateEmailRequest;
import com.digitalseal.dto.request.UpdateProfileRequest;
import com.digitalseal.dto.response.TransferRecipientResponse;
import com.digitalseal.dto.response.UserResponse;
import com.digitalseal.exception.InvalidCredentialsException;
import com.digitalseal.exception.InvalidSignatureException;
import com.digitalseal.exception.UserAlreadyExistsException;
import com.digitalseal.model.entity.User;
import com.digitalseal.repository.BrandRepository;
import com.digitalseal.repository.UserRepository;
import java.util.List;
import com.digitalseal.util.SignatureVerifier;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class UserService {
    
    private final UserRepository userRepository;
    private final BrandRepository brandRepository;
    private final PasswordEncoder passwordEncoder;
    private final SignatureVerifier signatureVerifier;
    
    
    public UserResponse getProfile(Long userId) {
        User user = findUserById(userId);
        return mapToUserResponse(user);
    }

    
    @Transactional(readOnly = true)
    public List<TransferRecipientResponse> getTransferRecipients(Long requesterUserId) {
        return userRepository.findActiveTransferRecipientsExcludingUserId(requesterUserId)
                .stream()
                .map(this::mapToTransferRecipientResponse)
                .toList();
    }
    
    
    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findUserById(userId);
        
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getPhoneNumber() != null) {
            String normalizedPhone = request.getPhoneNumber().trim();
            user.setPhoneNumber(normalizedPhone.isBlank() ? null : normalizedPhone);
        }
        
        User savedUser = userRepository.save(user);
        log.info("Profile updated for user ID: {}", userId);
        
        return mapToUserResponse(savedUser);
    }
    
    
    @Transactional
    public UserResponse updateEmail(Long userId, UpdateEmailRequest request) {
        User user = findUserById(userId);

        if (userRepository.existsByEmail(request.getNewEmail())) {
            throw new UserAlreadyExistsException("Email already in use");
        }
        
        user.setEmail(request.getNewEmail());
        user.setEmailVerified(false);
        
        User savedUser = userRepository.save(user);
        log.info("Email updated for user ID: {}", userId);
        
        return mapToUserResponse(savedUser);
    }
    
    
    @Transactional
    public UserResponse changePassword(Long userId, ChangePasswordRequest request) {
        User user = findUserById(userId);

        if (user.getPasswordHash() == null || 
            !passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Current password is incorrect");
        }
        
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        
        User savedUser = userRepository.save(user);
        log.info("Password changed for user ID: {}", userId);
        
        return mapToUserResponse(savedUser);
    }
    
    
    @Transactional
    public UserResponse connectWallet(Long userId, ConnectWalletRequest request) {
        User user = findUserById(userId);
        String normalizedWallet = normalizeWalletAddress(request.getWalletAddress());

        if (userRepository.existsByWalletAddressIgnoreCaseAndIdNot(normalizedWallet, userId)) {
            throw new UserAlreadyExistsException("Wallet already connected to another account");
        }

        if (brandRepository.existsByCompanyWalletAddressIgnoreCase(normalizedWallet)) {
            throw new UserAlreadyExistsException("Wallet already used by a brand profile");
        }

        boolean isValid = signatureVerifier.verifySignature(
            normalizedWallet,
            request.getMessage(),
            request.getSignature()
        );
        
        if (!isValid) {
            throw new InvalidSignatureException("Invalid wallet signature");
        }
        
        user.setWalletAddress(normalizedWallet);
        user.setWalletVerified(true);
        
        User savedUser = userRepository.save(user);
        log.info("Wallet connected for user ID: {}", userId);
        
        return mapToUserResponse(savedUser);
    }

    
    @Transactional
    public UserResponse disconnectWallet(Long userId) {
        User user = findUserById(userId);

        user.setWalletAddress(null);
        user.setWalletVerified(false);

        User savedUser = userRepository.save(user);
        log.info("Wallet disconnected for user ID: {}", userId);

        return mapToUserResponse(savedUser);
    }
    
    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
   public UserResponse mapToUserResponse(User user) {
    return UserResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .phoneNumber(user.getPhoneNumber())
            .walletAddress(user.getWalletAddress())
            .role(user.getRole() != null ? user.getRole().name() : null)
            .authType(user.getAuthType() != null ? user.getAuthType().name() : null)
            .emailVerified(user.getEmailVerified())
            .walletVerified(user.getWalletVerified())
            .createdAt(user.getCreatedAt())
            .lastLoginAt(user.getLastLoginAt())
            .build();
}

    private TransferRecipientResponse mapToTransferRecipientResponse(User user) {
        String walletAddress = normalizeWalletAddress(user.getWalletAddress());
        String userName = resolveUserName(user.getUserName(), user.getEmail());
        String fullName = resolveFullName(user.getFirstName(), user.getLastName());
        String displayName = fullName.isBlank()
                ? (userName.isBlank() ? shortenWallet(walletAddress) : userName)
                : fullName;

        return TransferRecipientResponse.builder()
                .id(user.getId())
                .userName(userName)
                .displayName(displayName)
                .walletAddress(walletAddress)
                .build();
    }

    private String resolveUserName(String userName, String email) {
        String normalizedUserName = String.valueOf(userName == null ? "" : userName).trim();
        if (!normalizedUserName.isBlank()) {
            return normalizedUserName;
        }

        String normalizedEmail = String.valueOf(email == null ? "" : email).trim();
        int atIndex = normalizedEmail.indexOf('@');
        if (atIndex > 0) {
            return normalizedEmail.substring(0, atIndex);
        }
        return normalizedEmail;
    }

    private String resolveFullName(String firstName, String lastName) {
        String safeFirstName = String.valueOf(firstName == null ? "" : firstName).trim();
        String safeLastName = String.valueOf(lastName == null ? "" : lastName).trim();
        return (safeFirstName + " " + safeLastName).trim();
    }

    private String shortenWallet(String walletAddress) {
        String wallet = String.valueOf(walletAddress == null ? "" : walletAddress).trim();
        if (wallet.length() < 10) {
            return wallet;
        }
        return wallet.substring(0, 6) + "..." + wallet.substring(wallet.length() - 4);
    }

    private String normalizeWalletAddress(String walletAddress) {
        return String.valueOf(walletAddress == null ? "" : walletAddress).trim().toLowerCase();
    }
}
