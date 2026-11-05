package se.fcvaxjo.api.security;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import se.fcvaxjo.api.service.AccountAccessService;

/**
 * Reads a Bearer JWT and logs the request in only when the account still
 * matches that token.
 *
 * This filter does not write the 401 itself. Protected routes already answer
 * 401 when nobody is logged in, and the public login route must stay open.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final AccountAccessService accountAccessService;

    public JwtAuthFilter(JwtService jwtService, AccountAccessService accountAccessService) {
        this.jwtService = jwtService;
        this.accountAccessService = accountAccessService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String token = bearerToken(request);
        if (token != null && !logInIfAccountStillMatches(token)) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    private String bearerToken(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            return null;
        }

        String token = header.substring(BEARER_PREFIX.length());
        if (token.isBlank()) {
            return null;
        }
        return token;
    }

    private boolean logInIfAccountStillMatches(String token) {
        Long userId;
        String roleName;
        try {
            userId = jwtService.getUserId(token);
            roleName = jwtService.getRoleName(token);
        } catch (RuntimeException ex) {
            // Expired or forged token: not logged in. A database error is not
            // caught here, so a real outage still fails the request.
            return false;
        }

        if (userId == null || roleName == null || roleName.isBlank()) {
            return false;
        }
        if (!accountAccessService.tokenStillMatchesAccount(userId, roleName)) {
            return false;
        }

        // hasRole('COACH') in @PreAuthorize looks for the authority ROLE_COACH.
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                userId,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + roleName)));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        return true;
    }
}
