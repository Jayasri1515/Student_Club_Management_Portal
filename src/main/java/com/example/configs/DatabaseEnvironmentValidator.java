package com.example.configs;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

/**
 * Fails application startup early, with a clear message, when the required
 * database credentials have not been supplied.
 *
 * <p>Database credentials are intentionally not stored in source control. They
 * must come from environment variables (DB_USERNAME, DB_PASSWORD) or from a
 * git-ignored local profile. This post-processor runs after configuration files
 * have been loaded, so it validates the final, resolved values.
 *
 * <p>Only the NAMES of missing variables are ever reported; values are never
 * placed into messages or logs.
 */
public class DatabaseEnvironmentValidator implements EnvironmentPostProcessor, Ordered {

    /** Property key -> environment variable name that is expected to supply it. */
    static final String[][] REQUIRED = {
            { "spring.datasource.username", "DB_USERNAME" },
            { "spring.datasource.password", "DB_PASSWORD" },
    };

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        List<String> missing = findMissing(environment);
        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "Missing required database configuration: " + String.join(", ", missing)
                            + ". Set these environment variables (or define them in a git-ignored "
                            + "application-local.properties). See docs/DATABASE_CONFIG.md.");
        }
    }

    static List<String> findMissing(ConfigurableEnvironment environment) {
        List<String> missing = new ArrayList<>();
        for (String[] entry : REQUIRED) {
            if (!isPresent(environment, entry[0])) {
                missing.add(entry[1]);
            }
        }
        return missing;
    }

    private static boolean isPresent(ConfigurableEnvironment environment, String key) {
        try {
            String value = environment.getProperty(key);
            return value != null && !value.isBlank();
        } catch (IllegalArgumentException unresolvedPlaceholder) {
            // e.g. a DB_PASSWORD placeholder could not be resolved because the variable is not set
            return false;
        }
    }

    @Override
    public int getOrder() {
        // Run after ConfigDataEnvironmentPostProcessor so application*.properties are loaded.
        return Ordered.LOWEST_PRECEDENCE;
    }
}
