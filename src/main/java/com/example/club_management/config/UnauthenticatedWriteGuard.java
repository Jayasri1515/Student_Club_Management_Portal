package com.example.club_management.config;

import java.io.IOException;

import org.springframework.http.HttpMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * The backend has no authentication, so it cannot tell who is calling. Until it does, the
 * endpoints that change another user's data (leave club, update/delete activity) answer 403
 * unless this is switched on explicitly, which is meant for local development only.
 *
 * <p>This is a safeguard against exposing them by accident. It is NOT access control: when
 * enabled, any caller can use them.
 */
public class UnauthenticatedWriteGuard implements HandlerInterceptor {

    static final String DISABLED_MESSAGE = "This endpoint is disabled because the backend has no authentication. "
            + "Set APP_ENABLE_UNAUTHENTICATED_WRITES=true for local development only.";

    private final boolean enabled;

    public UnauthenticatedWriteGuard(boolean enabled) {
        this.enabled = enabled;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        if (enabled || !isGuardedMethod(request.getMethod())) {
            return true;
        }
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("text/plain;charset=UTF-8");
        response.getWriter().write(DISABLED_MESSAGE);
        return false;
    }

    // Registered only on the guarded paths. CORS preflight (OPTIONS) and reads are never blocked.
    private static boolean isGuardedMethod(String method) {
        return HttpMethod.PUT.matches(method) || HttpMethod.DELETE.matches(method);
    }
}
