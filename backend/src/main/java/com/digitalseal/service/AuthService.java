package com.digitalseal.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.digitalseal.dto.request.EmailLoginRequest;
import com.digitalseal.dto.request.EmailRegisterRequest;
import com.digitalseal.dto.request.ForgotPasswordRequest;
import com.digitalseal.dto.request.ResetPasswordRequest;
import com.digitalseal.dto.request.VerifyEmailRequest;
import com.digitalseal.dto.request.WalletLoginRequest;
import com.digitalseal.dto.request.WalletRegisterRequest;
import com.digitalseal.dto.response.AuthResponse;

import com.digitalseal.exception.AccountLockedException;
import com.digitalseal.exception.InvalidCredentialsException;
import com.digitalseal.exception.InvalidSignatureException;
import com.digitalseal.exception.UserAlreadyExistsException;
import com.digitalseal.model.entity.AuthType;
import com.digitalseal.model.entity.RefreshToken;
import com.digitalseal.model.entity.User;
import com.digitalseal.model.entity.UserRole;
import com.digitalseal.model.entity.VerificationType;
import com.digitalseal.repository.BrandRepository;
import com.digitalseal.repository.UserRepository;
import com.digitalseal.security.JwtTokenProvider;
import com.digitalseal.util.SignatureVerifier;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AuthService {
    
    private final UserRepository userRepository;
    private final BrandRepository brandRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final SignatureVerifier signatureVerifier;
    private final RefreshTokenService refreshTokenService;
    private final EmailService emailService;
    private final VerificationService verificationService;
    private final UserService userService;

    @Value("${app.frontend.reset-password-deeplink:zeal://changepassword}")
    private String resetPasswordDeepLink;
    
    
    @Transactional
    public AuthResponse registerWithEmail(EmailRegisterRequest request, String deviceInfo, String ipAddress) {
        log.info("Registering user with email: {}", request.getEmail());

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email already registered");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .userName(request.getUserName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .authType(AuthType.EMAIL)
                .role(UserRole.OWNER)
                .isActive(true)
                .emailVerified(false)
                .walletVerified(false)
                .build();
        
        User savedUser = userRepository.save(user);
        
        log.info("User registered successfully with ID: {}", savedUser.getId());

        String code = verificationService.generateCode(savedUser, VerificationType.EMAIL_VERIFICATION);
        emailService.sendVerificationEmail(savedUser.getEmail(), code, savedUser.getFirstName());

        String accessToken = jwtTokenProvider.generateToken(savedUser);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(savedUser, deviceInfo, ipAddress);
        
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationTime())
                .user(userService.mapToUserResponse(savedUser))
                .build();
    }
    
    
    @Transactional
    public AuthResponse loginWithEmail(EmailLoginRequest request, String deviceInfo, String ipAddress) {
        log.info("Login attempt for email: {}", request.getEmail());

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (user.getIsLocked()) {
            throw new AccountLockedException("Account locked due to multiple failed login attempts");
        }

        if (!user.getIsActive()) {
            throw new RuntimeException("Account is not active");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            user.incrementFailedAttempts();
            userRepository.save(user);
            throw new InvalidCredentialsException("Invalid email or password");
        }

        user.resetFailedAttempts();
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        
        log.info("User logged in successfully: {}", user.getEmail());

        String accessToken = jwtTokenProvider.generateToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user, deviceInfo, ipAddress);
        
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationTime())
                .user(userService.mapToUserResponse(user))
                .build();
    }
    
    
    public AuthResponse checkWalletRegistration(String walletAddress) {
        String normalizedWallet = normalizeWalletAddress(walletAddress);
        log.info("Checking wallet registration status: {}", normalizedWallet);

        boolean isRegistered = userRepository.existsByWalletAddressIgnoreCase(normalizedWallet)
            || brandRepository.existsByCompanyWalletAddressIgnoreCase(normalizedWallet);

        return AuthResponse.builder()
                .isRegistered(isRegistered)
                .build();
    }

    
    
@Transactional
public AuthResponse getWalletNonce(String walletAddress) {
    String normalizedWallet = normalizeWalletAddress(walletAddress);
    log.info("Nonce request for wallet: {}", normalizedWallet);

    String nonce = "nonce_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 1_000_000);
    String message = "Sign this nonce to authenticate with Digital Seal: " + nonce;

    User user = userRepository.findByWalletAddressIgnoreCase(normalizedWallet).orElse(null);
    if (user != null) {
        user.setWalletNonce(nonce);
        userRepository.save(user);
        log.info("Fresh nonce saved for wallet: {}", normalizedWallet);
    } else {
        log.warn("Nonce requested for unregistered wallet: {}", normalizedWallet);
    }

    return AuthResponse.builder()
            .nonce(nonce)
            .message(message)
            .build();
}
    
    
    @Transactional
    public AuthResponse registerWithWallet(WalletRegisterRequest request, String deviceInfo, String ipAddress) {
        String normalizedWallet = normalizeWalletAddress(request.getWalletAddress());
        log.info("Registering user with wallet: {}", normalizedWallet);

        if (userRepository.existsByWalletAddressIgnoreCase(normalizedWallet)
                || brandRepository.existsByCompanyWalletAddressIgnoreCase(normalizedWallet)) {
            throw new UserAlreadyExistsException("Wallet already registered");
        }

        boolean isValid = signatureVerifier.verifySignature(
            normalizedWallet,
            request.getMessage(),
            request.getSignature()
        );
        
        if (!isValid) {
            throw new InvalidSignatureException("Invalid wallet signature");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .userName(request.getUserName())
                .walletAddress(normalizedWallet)
                .authType(AuthType.WALLET)
                .role(UserRole.OWNER)
                .isActive(true)
                .emailVerified(false)
                .walletVerified(true)
                .build();
        
        User savedUser = userRepository.save(user);
        log.info("User registered with wallet, ID: {}", savedUser.getId());

        String accessToken = jwtTokenProvider.generateToken(savedUser);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(savedUser, deviceInfo, ipAddress);
        
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationTime())
                .user(userService.mapToUserResponse(savedUser))
                .build();
    }
    
    
    @Transactional
    public AuthResponse loginWithWallet(WalletLoginRequest request, String deviceInfo, String ipAddress) {
        String normalizedWallet = normalizeWalletAddress(request.getWalletAddress());
        log.info("Wallet login attempt: {}", normalizedWallet);

        User user = userRepository.findByWalletAddressIgnoreCase(normalizedWallet)
                .orElse(null);

        if (user == null) {
            if (brandRepository.existsByCompanyWalletAddressIgnoreCase(normalizedWallet)) {
                throw new RuntimeException("Wallet is already assigned to a brand profile and cannot be used for wallet login.");
            }
            throw new RuntimeException("Wallet not registered. Please sign up first.");
        }

        if (!user.getIsActive()) {
            throw new RuntimeException("Account is not active");
        }

        boolean isValid = signatureVerifier.verifySignature(
            normalizedWallet,
            request.getMessage(),
            request.getSignature()
        );
        
        if (!isValid) {
            throw new InvalidSignatureException("Invalid wallet signature");
        }

        user.setLastLoginAt(LocalDateTime.now());
        user.regenerateNonce();
        userRepository.save(user);
        
        log.info("User logged in with wallet: {}", user.getWalletAddress());

        String accessToken = jwtTokenProvider.generateToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user, deviceInfo, ipAddress);
        
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationTime())
                .user(userService.mapToUserResponse(user))
                .build();
    }

    private String normalizeWalletAddress(String walletAddress) {
        return String.valueOf(walletAddress == null ? "" : walletAddress).trim().toLowerCase();
    }
    
    
    @Transactional
    public AuthResponse refreshToken(String refreshTokenStr, String deviceInfo, String ipAddress) {
        RefreshToken refreshToken = refreshTokenService.findByToken(refreshTokenStr)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));
        
        refreshTokenService.verifyExpiration(refreshToken);
        
        if (refreshToken.getIsRevoked()) {
            throw new RuntimeException("Refresh token has been revoked");
        }
        
        User user = refreshToken.getUser();

        String accessToken = jwtTokenProvider.generateToken(user);
        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user, deviceInfo, ipAddress);

        refreshTokenService.revokeToken(refreshTokenStr);
        
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(newRefreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationTime())
                .build();
    }
    
    
    @Transactional
    public void logout(String refreshToken) {
        refreshTokenService.revokeToken(refreshToken);
    }
    
    
    @Transactional
    public void verifyEmail(Long userId, VerifyEmailRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (user.getEmailVerified()) {
            throw new RuntimeException("Email is already verified");
        }
        
        verificationService.verifyCode(user, request.getCode(), VerificationType.EMAIL_VERIFICATION);
        
        user.setEmailVerified(true);
        userRepository.save(user);
        
        log.info("Email verified for user ID: {}", userId);
    }
    
    
    @Transactional
    public void resendVerificationEmail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (user.getEmailVerified()) {
            throw new RuntimeException("Email is already verified");
        }
        
        if (user.getEmail() == null) {
            throw new RuntimeException("No email address associated with this account");
        }
        
        String code = verificationService.generateCode(user, VerificationType.EMAIL_VERIFICATION);
        emailService.sendVerificationEmail(user.getEmail(), code, user.getFirstName());
        
        log.info("Verification email resent to user ID: {}", userId);
    }
    
    
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);

        if (user == null) {
            log.warn("Password reset requested for unknown email: {}", request.getEmail());
            return;
        }
        
        String code = verificationService.generateCode(user, VerificationType.PASSWORD_RESET);
        String resetLink = buildResetPasswordLink(user.getEmail(), code);
        emailService.sendPasswordResetEmail(user.getEmail(), code, user.getFirstName(), resetLink);
        
        log.info("Password reset code sent to: {}", request.getEmail());
    }
    
    
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or code"));
        
        verificationService.verifyCode(user, request.getCode(), VerificationType.PASSWORD_RESET);
        
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.resetFailedAttempts();
        userRepository.save(user);
        
        log.info("Password reset successful for user ID: {}", user.getId());
    }

    private String buildResetPasswordLink(String email, String code) {
        String baseLink = (resetPasswordDeepLink == null || resetPasswordDeepLink.isBlank())
                ? "zeal://changepassword"
                : resetPasswordDeepLink.trim();

        String separator = baseLink.contains("?") ? "&" : "?";
        String encodedEmail = URLEncoder.encode(email, StandardCharsets.UTF_8);
        String encodedCode = URLEncoder.encode(code, StandardCharsets.UTF_8);

        return baseLink + separator + "email=" + encodedEmail + "&code=" + encodedCode;
    }
}
