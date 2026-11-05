package se.fcvaxjo.api.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.servlet.FilterChain;
import se.fcvaxjo.api.service.AccountAccessService;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private AccountAccessService accountAccessService;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private JwtAuthFilter jwtAuthFilter;

    private static final Instant ISSUED_AT = Instant.parse("2026-11-05T12:00:00Z");

    @AfterEach
    void clearLogin() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilter_logsInWhenAccountStillMatchesToken() throws Exception {
        when(jwtService.getUserId("good-token")).thenReturn(7L);
        when(jwtService.getRoleName("good-token")).thenReturn("COACH");
        when(jwtService.getIssuedAt("good-token")).thenReturn(ISSUED_AT);
        when(accountAccessService.tokenStillMatchesAccount(7L, "COACH", ISSUED_AT)).thenReturn(true);

        MockHttpServletRequest request = requestWithBearer("good-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        jwtAuthFilter.doFilter(request, response, filterChain);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertEquals(7L, authentication.getPrincipal());
        assertEquals(
                List.of(new SimpleGrantedAuthority("ROLE_COACH")),
                List.copyOf(authentication.getAuthorities()));
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_doesNotLogInWhenAccountNoLongerMatches() throws Exception {
        when(jwtService.getUserId("old-token")).thenReturn(7L);
        when(jwtService.getRoleName("old-token")).thenReturn("COACH");
        when(jwtService.getIssuedAt("old-token")).thenReturn(ISSUED_AT);
        when(accountAccessService.tokenStillMatchesAccount(7L, "COACH", ISSUED_AT)).thenReturn(false);

        MockHttpServletRequest request = requestWithBearer("old-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        jwtAuthFilter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_doesNotLogInWhenTokenCannotBeRead() throws Exception {
        when(jwtService.getUserId("broken-token")).thenThrow(new IllegalArgumentException("broken"));

        MockHttpServletRequest request = requestWithBearer("broken-token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        jwtAuthFilter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(jwtService, never()).getRoleName("broken-token");
        verifyNoInteractions(accountAccessService);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doFilter_ignoresRequestsWithoutABearerToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        jwtAuthFilter.doFilter(request, response, filterChain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verifyNoInteractions(jwtService);
        verifyNoInteractions(accountAccessService);
        verify(filterChain).doFilter(request, response);
    }

    private MockHttpServletRequest requestWithBearer(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        return request;
    }
}
