package com.example.club_management.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.example.club_management.controllers.ActivityController;
import com.example.club_management.repositories.ClubRepository;
import com.example.club_management.repositories.UserRepository;
import com.example.club_management.services.ActivityService;
import com.example.club_management.services.ClubService;
import com.example.club_management.services.MembershipService;

/**
 * Loads the real web layer (no database) so the guard is checked as Spring wires it from
 * {@code app.unauthenticated-writes.enabled}. The in-memory URL keeps the DB startup check out of the way.
 */
class UnauthenticatedWriteWiringTest {

    @WebMvcTest(controllers = ActivityController.class)
    @TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:wiring")
    abstract static class Base {
        @Autowired
        MockMvc mockMvc;
        @MockBean
        ActivityService activityService;
        @MockBean
        ClubService clubService;
        @MockBean
        MembershipService membershipService;
        @MockBean
        UserRepository userRepository;
        @MockBean
        ClubRepository clubRepository;
    }

    @Nested
    class DefaultConfiguration extends Base {
        @Test
        void activityDeleteIsForbiddenWithoutTheSwitch() throws Exception {
            mockMvc.perform(delete("/api/activities/5")).andExpect(status().isForbidden());
        }
    }

    @Nested
    @TestPropertySource(properties = "app.unauthenticated-writes.enabled=true")
    class SwitchedOn extends Base {
        @Test
        void activityDeleteReachesTheHandlerWhenEnabled() throws Exception {
            // The mocked service finds nothing, so the handler's own 404 proves the guard let it through.
            mockMvc.perform(delete("/api/activities/5")).andExpect(status().isNotFound());
        }
    }
}
