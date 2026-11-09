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

    /** In-memory databases need no credentials, so tests that use them are not forced to supply any. */
    private static final String[] EMBEDDED_URL_PREFIXES = { "jdbc:h2:", "jdbc:hsqldb:", "jdbc:derby:" };

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        List<String> missing = findMissing(environment);
        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "Missing required database configuration: " + String.join(", ", missing)
                            + ". Set these environment variables to real values (or define them in a "
                            + "git-ignored application-local.properties); an unedited example placeholder "
                            + "such as <your-db-password> does not count. See docs/DATABASE_CONFIG.md.");
        }
    }

    static List<String> findMissing(ConfigurableEnvironment environment) {
        List<String> missing = new ArrayList<>();
        if (usesEmbeddedDatabase(environment)) {
            return missing;
        }
        for (String[] entry : REQUIRED) {
            if (!isPresent(environment, entry[0])) {
                missing.add(entry[1]);
            }
        }
        return missing;
    }

    private static boolean usesEmbeddedDatabase(ConfigurableEnvironment environment) {
        String url = readProperty(environment, "spring.datasource.url");
        if (url == null) {
            return false;
        }
        String lower = url.trim().toLowerCase();
        for (String prefix : EMBEDDED_URL_PREFIXES) {
            if (lower.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isPresent(ConfigurableEnvironment environment, String key) {
        String value = readProperty(environment, key);
        return value != null && !value.isBlank() && !isUneditedPlaceholder(value);
    }

    /** The values in application-local.properties.example, e.g. {@code <your-db-password>}, copied unedited. */
    private static boolean isUneditedPlaceholder(String value) {
        String trimmed = value.trim();
        return trimmed.length() > 2 && trimmed.startsWith("<") && trimmed.endsWith(">");
    }

    private static String readProperty(ConfigurableEnvironment environment, String key) {
        try {
            return environment.getProperty(key);
        } catch (IllegalArgumentException unresolvedPlaceholder) {
            // e.g. a ${...} placeholder that could not be resolved
            return null;
        }
    }

    @Override
    public int getOrder() {
        // Run after ConfigDataEnvironmentPostProcessor so application*.properties are loaded.
        return Ordered.LOWEST_PRECEDENCE;
    }
}
