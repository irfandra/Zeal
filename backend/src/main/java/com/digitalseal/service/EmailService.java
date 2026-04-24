package com.digitalseal.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("null")
public class EmailService {
        private final JavaMailSender mailSender;

    public record EmailAttachment(String filename, byte[] data, String contentType) {}
    
    @Value("${app.mail.from}")
    private String fromEmail;
    
    @Value("${app.mail.from-name}")
    private String fromName;
    
    
    @Async
    public void sendEmail(String toEmail, String subject, String content, boolean isHtml) {
        log.info("[EMAIL] Sending '{}' to: {} (from: {})", subject, toEmail, fromEmail);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(content, isHtml);
            mailSender.send(message);
            log.info("[EMAIL] Sent successfully to: {}", toEmail);
        } catch (MailException e) {
            log.error("[EMAIL] Spring Mail failure sending to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("[EMAIL] MIME error sending to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send email", e);
        }
    }

    
    public void sendEmailWithAttachments(
            String toEmail,
            String subject,
            String content,
            boolean isHtml,
            List<EmailAttachment> attachments
    ) {
        int attachmentCount = attachments == null ? 0 : attachments.size();
        log.info("[EMAIL] Sending '{}' to: {} with {} attachment(s)", subject, toEmail, attachmentCount);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(content, isHtml);

            if (attachments != null) {
                for (EmailAttachment attachment : attachments) {
                    if (attachment == null || attachment.data() == null || attachment.data().length == 0) {
                        continue;
                    }

                    String filename = String.valueOf(attachment.filename() == null ? "attachment.bin" : attachment.filename()).trim();
                    if (filename.isBlank()) {
                        filename = "attachment.bin";
                    }

                    String contentType = String.valueOf(attachment.contentType() == null ? "application/octet-stream" : attachment.contentType()).trim();
                    if (contentType.isBlank()) {
                        contentType = "application/octet-stream";
                    }

                    helper.addAttachment(filename, new ByteArrayResource(attachment.data()), contentType);
                }
            }

            mailSender.send(message);
            log.info("[EMAIL] Sent successfully to: {} with {} attachment(s)", toEmail, attachmentCount);
        } catch (MailException e) {
            log.error("[EMAIL] Spring Mail failure sending to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("[EMAIL] MIME error sending to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send email", e);
        }
    }
    
    
    @Async
    public void sendVerificationEmail(String toEmail, String code, String firstName) {
        String subject = "Digital Seal - Verify Your Email";
        String content = buildVerificationEmailContent(code, firstName);
        sendEmail(toEmail, subject, content, true);
    }
    
    
    @Async
    public void sendPasswordResetEmail(String toEmail, String code, String firstName) {
        sendPasswordResetEmail(toEmail, code, firstName, null);
    }

    
    @Async
    public void sendPasswordResetEmail(String toEmail, String code, String firstName, String resetLink) {
        String subject = "Digital Seal - Password Reset";
        String content = buildPasswordResetEmailContent(code, firstName, resetLink);
        sendEmail(toEmail, subject, content, true);
    }

    
    private String buildVerificationEmailContent(String code, String firstName) {
        String name = (firstName != null && !firstName.isBlank()) ? firstName : "there";
        return """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; padding: 20px 0;">
                        <h1 style="color: #1a1a2e; margin: 0;">Digital Seal</h1>
                        <p style="color: #666; font-size: 14px;">Luxury Product Authentication</p>
                    </div>
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
                        <h2 style="color: #1a1a2e;">Verify Your Email</h2>
                        <p style="color: #555;">Hi %s,</p>
                        <p style="color: #555;">Use the following 6-digit code to verify your email address:</p>
                        <div style="background: #1a1a2e; color: #fff; font-size: 32px; letter-spacing: 8px; 
                                    padding: 15px 30px; border-radius: 8px; display: inline-block; margin: 20px 0;
                                    font-weight: bold;">
                            %s
                        </div>
                        <p style="color: #888; font-size: 13px;">This code expires in <strong>10 minutes</strong>.</p>
                        <p style="color: #888; font-size: 13px;">If you didn't create an account, you can safely ignore this email.</p>
                    </div>
                    <div style="text-align: center; padding: 20px 0; color: #aaa; font-size: 12px;">
                        <p>&copy; 2026 Digital Seal. All rights reserved.</p>
                    </div>
                </div>
                """.formatted(name, code);
    }
    
        private String buildPasswordResetEmailContent(String code, String firstName, String resetLink) {
        String name = (firstName != null && !firstName.isBlank()) ? firstName : "there";
                String normalizedLink = (resetLink != null && !resetLink.isBlank()) ? resetLink : "";
                String resetLinkSection = normalizedLink.isBlank()
                                ? ""
                                : """
                                                <p style=\"color: #555; margin-top: 18px;\">Or tap the secure link below to continue in the app:</p>
                                                <p style=\"margin: 16px 0;\">
                                                    <a href=\"%s\" style=\"display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;\">Reset Password in App</a>
                                                </p>
                                                <p style=\"color: #888; font-size: 12px; word-break: break-all;\">%s</p>
                                                """.formatted(normalizedLink, normalizedLink);

        return """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; padding: 20px 0;">
                        <h1 style="color: #1a1a2e; margin: 0;">Digital Seal</h1>
                        <p style="color: #666; font-size: 14px;">Luxury Product Authentication</p>
                    </div>
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 30px; text-align: center;">
                        <h2 style="color: #1a1a2e;">Reset Your Password</h2>
                        <p style="color: #555;">Hi %s,</p>
                        <p style="color: #555;">We received a request to reset your password. Use the following code:</p>
                        <div style="background: #1a1a2e; color: #fff; font-size: 32px; letter-spacing: 8px; 
                                    padding: 15px 30px; border-radius: 8px; display: inline-block; margin: 20px 0;
                                    font-weight: bold;">
                            %s
                        </div>
                        %s
                        <p style="color: #888; font-size: 13px;">This code expires in <strong>10 minutes</strong>.</p>
                        <p style="color: #888; font-size: 13px;">If you didn't request a password reset, you can safely ignore this email.</p>
                    </div>
                    <div style="text-align: center; padding: 20px 0; color: #aaa; font-size: 12px;">
                        <p>&copy; 2026 Digital Seal. All rights reserved.</p>
                    </div>
                </div>
                """.formatted(name, code, resetLinkSection);
    }
}
