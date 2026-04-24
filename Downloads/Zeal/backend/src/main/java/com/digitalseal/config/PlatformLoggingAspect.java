package com.digitalseal.config;

import com.digitalseal.model.entity.LogCategory;
import com.digitalseal.model.entity.LogLevel;
import com.digitalseal.service.PlatformLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;


@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class PlatformLoggingAspect {

    private final PlatformLogService platformLogService;

    
    @Around("execution(* com.digitalseal.controller.*.*(..))")
    public Object logControllerCall(ProceedingJoinPoint pjp) throws Throwable {

        long start = System.currentTimeMillis();

        String httpMethod   = "UNKNOWN";
        String requestPath  = "UNKNOWN";
        String ipAddress    = null;
        String userAgent    = null;

        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest req = attrs.getRequest();
            httpMethod  = req.getMethod();
            requestPath = req.getRequestURI();
            ipAddress   = resolveClientIp(req);
            userAgent   = truncate(req.getHeader("User-Agent"), 500);
        }

        Long   userId    = null;
        String userEmail = null;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth.getPrincipal() instanceof String)) {
            try { userId = Long.parseLong(auth.getName()); } catch (NumberFormatException ignored) {}
        }

        String className = pjp.getTarget().getClass().getSimpleName();
        LogCategory category = categoryForClass(className);

        String action = buildAction(httpMethod, requestPath);

        Throwable caught = null;
        try {
            return pjp.proceed();
        } catch (Throwable t) {
            caught = t;
            throw t;
        } finally {
            long durationMs = System.currentTimeMillis() - start;
            boolean success = caught == null;
            LogLevel level  = success ? LogLevel.INFO : levelForException(caught);
            String errorMsg = caught != null ? caught.getClass().getSimpleName() + ": " + caught.getMessage() : null;

            platformLogService.logRequest(
                    level, category, action,
                    userId, userEmail,
                    httpMethod, requestPath,
                    ipAddress, userAgent,
                    durationMs, success,
                    null,
                    errorMsg
            );
        }
    }


    
    private LogCategory categoryForClass(String name) {
        if (name.startsWith("Auth"))        return LogCategory.AUTH;
        if (name.startsWith("Order"))       return LogCategory.ORDER;
        if (name.startsWith("Claim"))       return LogCategory.CLAIM;
        if (name.startsWith("Blockchain"))  return LogCategory.BLOCKCHAIN;
        if (name.startsWith("Product"))     return LogCategory.PRODUCT;
        if (name.startsWith("Brand"))       return LogCategory.BRAND;
        if (name.startsWith("User"))        return LogCategory.USER;
        if (name.startsWith("Marketplace")) return LogCategory.PRODUCT;
        if (name.startsWith("Verify"))      return LogCategory.BLOCKCHAIN;
        if (name.startsWith("PlatformLog")) return LogCategory.SYSTEM;
        return LogCategory.SYSTEM;
    }

    
    private String buildAction(String method, String path) {

        String stripped = path.replaceFirst("^/api/v\\d+", "");
        String normalised = stripped.replaceAll("/\\d+", "/{id}");
        return method + " " + normalised;
    }

    
    private LogLevel levelForException(Throwable t) {
        String name = t.getClass().getSimpleName();
        if (name.contains("NotFound") || name.contains("InvalidState") || name.contains("Unauthorized")) {
            return LogLevel.WARN;
        }
        return LogLevel.ERROR;
    }

    
    private String resolveClientIp(HttpServletRequest req) {
        String forwarded = req.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
