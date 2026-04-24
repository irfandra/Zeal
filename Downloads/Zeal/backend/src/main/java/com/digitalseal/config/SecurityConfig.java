package com.digitalseal.config;

import com.digitalseal.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {
    
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${security.dev-auth-bypass-enabled:false}")
    private boolean devAuthBypassEnabled;
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configure(http))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        if (devAuthBypassEnabled) {
            log.warn("SECURITY DEV BYPASS ENABLED: requests without JWT are treated as OWNER/BRAND");
            http.anonymous(anonymous -> anonymous
                .principal("1")
                .authorities("ROLE_OWNER", "ROLE_BRAND")
            );
        }

        http
            .authorizeHttpRequests(auth -> {
                auth
                .requestMatchers("/authcollections", "/brandsproducts").permitAll()
                .requestMatchers(HttpMethod.GET, "/brandsitems").permitAll()

                .requestMatchers(HttpMethod.GET, "/productsproducts").permitAll()

                .requestMatchers(HttpMethod.GET, "/marketplace", "/marketplace/**").permitAll()

                .requestMatchers(HttpMethod.GET, "/verify/**").permitAll()

                .requestMatchers(HttpMethod.GET, "/blockchain/status", "/blockchain/verify/**").permitAll()

                .requestMatchers("/admin/logs/**").authenticated()

                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll();

                if (devAuthBypassEnabled) {
                    auth.anyRequest().permitAll();
                } else {
                    auth.anyRequest().authenticated();
                }
            })
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
