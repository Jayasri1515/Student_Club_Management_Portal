package com.example.configs;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.PropertiesLoaderUtils;

class DatabaseEnvironmentValidatorTest {

    private final DatabaseEnvironmentValidator validator = new DatabaseEnvironmentValidator();

    /**
     * Environment built from the real application.properties plus the given fake
     * environment variables. The real system env/properties of the host are removed
     * so results are deterministic.
     */
    private StandardEnvironment environmentWith(Map<String, Object> fakeEnvVars) throws IOException {
        StandardEnvironment env = new StandardEnvironment();
        env.getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
        env.getPropertySources().remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);

        Properties props = PropertiesLoaderUtils.loadProperties(new ClassPathResource("application.properties"));
        Map<String, Object> appProps = new HashMap<>();
        props.forEach((k, v) -> appProps.put(k.toString(), v));
        env.getPropertySources().addLast(new MapPropertySource("applicationProperties", appProps));
        env.getPropertySources().addFirst(new MapPropertySource("fakeEnv", fakeEnvVars));
        return env;
    }

    @Test
    void startupFailsClearlyWhenBothVariablesMissing() throws IOException {
        StandardEnvironment env = environmentWith(Map.of());
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> validator.postProcessEnvironment(env, null));
        assertTrue(ex.getMessage().contains("DB_USERNAME"));
        assertTrue(ex.getMessage().contains("DB_PASSWORD"));
    }

    @Test
    void reportsOnlyTheMissingVariableAndNeverEchoesValues() throws IOException {
        StandardEnvironment env = environmentWith(Map.of("DB_USERNAME", "placeholder-user"));
        assertEquals(List.of("DB_PASSWORD"), DatabaseEnvironmentValidator.findMissing(env));
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> validator.postProcessEnvironment(env, null));
        assertFalse(ex.getMessage().contains("placeholder-user"), "values must never appear in the message");
    }

    @Test
    void blankValuesAreRejected() throws IOException {
        StandardEnvironment env = environmentWith(Map.of("DB_USERNAME", "  ", "DB_PASSWORD", ""));
        assertEquals(List.of("DB_USERNAME", "DB_PASSWORD"), DatabaseEnvironmentValidator.findMissing(env));
    }

    @Test
    void startupSucceedsWithSafePlaceholderValues() throws IOException {
        StandardEnvironment env = environmentWith(
                Map.of("DB_USERNAME", "placeholder-user", "DB_PASSWORD", "placeholder-password"));
        validator.postProcessEnvironment(env, null); // must not throw
        assertEquals("jdbc:mysql://localhost:3306/club_db", env.getProperty("spring.datasource.url"));
        assertEquals("placeholder-user", env.getProperty("spring.datasource.username"));
    }

    @Test
    void propertiesDefinedDirectlyInLocalProfileAlsoSatisfyValidation() throws IOException {
        StandardEnvironment env = environmentWith(Map.of(
                "spring.datasource.username", "local-user",
                "spring.datasource.password", "local-password"));
        assertTrue(DatabaseEnvironmentValidator.findMissing(env).isEmpty());
    }

    @Test
    void committedConfigUsesPlaceholdersNotLiteralCredentials() throws IOException {
        Properties props = PropertiesLoaderUtils.loadProperties(new ClassPathResource("application.properties"));
        assertEquals("${DB_USERNAME:}", props.getProperty("spring.datasource.username"));
        assertEquals("${DB_PASSWORD:}", props.getProperty("spring.datasource.password"));
    }

    @Test
    void embeddedInMemoryDatabaseNeedsNoCredentials() throws IOException {
        StandardEnvironment env = environmentWith(Map.of("spring.datasource.url", "jdbc:h2:mem:testdb"));
        assertTrue(DatabaseEnvironmentValidator.findMissing(env).isEmpty());
        validator.postProcessEnvironment(env, null); // must not throw
    }

    @Test
    void mysqlUrlStillRequiresCredentials() throws IOException {
        StandardEnvironment env = environmentWith(Map.of("spring.datasource.url", "jdbc:mysql://db.example:3306/club_db"));
        assertEquals(List.of("DB_USERNAME", "DB_PASSWORD"), DatabaseEnvironmentValidator.findMissing(env));
    }

    @Test
    void uneditedExamplePlaceholdersAreRejected() throws IOException {
        StandardEnvironment env = environmentWith(
                Map.of("DB_USERNAME", "<your-db-user>", "DB_PASSWORD", "<your-db-password>"));
        assertEquals(List.of("DB_USERNAME", "DB_PASSWORD"), DatabaseEnvironmentValidator.findMissing(env));
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> validator.postProcessEnvironment(env, null));
        assertFalse(ex.getMessage().contains("<your-db-password>=") , "values must never be echoed");
    }

    @Test
    void realLookingValuesContainingAngleBracketsInTheMiddleAreAccepted() throws IOException {
        StandardEnvironment env = environmentWith(Map.of("DB_USERNAME", "app_user", "DB_PASSWORD", "pa<ss>word"));
        assertTrue(DatabaseEnvironmentValidator.findMissing(env).isEmpty());
    }
}
