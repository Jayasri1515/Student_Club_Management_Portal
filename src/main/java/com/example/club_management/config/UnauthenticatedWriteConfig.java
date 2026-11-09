package com.example.club_management.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UnauthenticatedWriteConfig implements WebMvcConfigurer {

    /** Leave club, update activity, delete activity (PUT/DELETE only; see UnauthenticatedWriteGuard). */
    static final String[] GUARDED_PATHS = { "/api/memberships/user/*/club/*", "/api/activities/*" };

    private static final Logger logger = LoggerFactory.getLogger(UnauthenticatedWriteConfig.class);

    private final boolean enabled;

    public UnauthenticatedWriteConfig(@Value("${app.unauthenticated-writes.enabled:false}") boolean enabled) {
        this.enabled = enabled;
        if (enabled) {
            logger.warn("APP_ENABLE_UNAUTHENTICATED_WRITES is on: leave-club and activity update/delete accept "
                    + "requests from any caller. Use for local development only.");
        }
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new UnauthenticatedWriteGuard(enabled)).addPathPatterns(GUARDED_PATHS);
    }
}
