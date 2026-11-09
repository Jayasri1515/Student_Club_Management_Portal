package com.example.club_management.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.club_management.controllers.ActivityController;
import com.example.club_management.controllers.MembershipController;
import com.example.club_management.models.Activity;
import com.example.club_management.repositories.ClubRepository;
import com.example.club_management.repositories.UserRepository;
import com.example.club_management.services.ActivityService;
import com.example.club_management.services.ClubService;
import com.example.club_management.services.MembershipService;

/** Pure mock-based tests (no Spring context, no database). */
@ExtendWith(MockitoExtension.class)
class UnauthenticatedWriteGuardTest {

    @Mock
    private ActivityService activityService;
    @Mock
    private ClubService clubService;
    @Mock
    private MembershipService membershipService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ClubRepository clubRepository;
    @InjectMocks
    private ActivityController activityController;
    @InjectMocks
    private MembershipController membershipController;

    private MockMvc mockMvc(boolean enabled) {
        return MockMvcBuilders.standaloneSetup(activityController, membershipController)
                .addMappedInterceptors(UnauthenticatedWriteConfig.GUARDED_PATHS, new UnauthenticatedWriteGuard(enabled))
                .build();
    }

    @Test
    void leaveClubIsForbiddenByDefaultAndNothingIsTouched() throws Exception {
        mockMvc(false).perform(delete("/api/memberships/user/3/club/1"))
                .andExpect(status().isForbidden())
                .andExpect(content().string(UnauthenticatedWriteGuard.DISABLED_MESSAGE));

        verifyNoInteractions(userRepository, clubRepository, membershipService);
    }

    @Test
    void activityUpdateAndDeleteAreForbiddenByDefaultAndNothingIsTouched() throws Exception {
        MockMvc mvc = mockMvc(false);

        mvc.perform(put("/api/activities/5").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"x\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/activities/5")).andExpect(status().isForbidden());

        verifyNoInteractions(activityService);
    }

    @Test
    void reads_preflight_and_other_methods_are_not_blocked() throws Exception {
        when(userRepository.findById(3L)).thenReturn(Optional.empty());
        MockMvc mvc = mockMvc(false);

        // Reaches the real handler (its own 404 for an unknown user), not the guard's 403.
        mvc.perform(get("/api/memberships/user/3")).andExpect(status().isNotFound());
    }

    @Test
    void corsPreflightAndOtherMethodsPassTheGuardEvenWhenDisabled() throws Exception {
        UnauthenticatedWriteGuard guard = new UnauthenticatedWriteGuard(false);
        for (String method : new String[] { "OPTIONS", "GET", "POST", "HEAD" }) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            assertTrue(guard.preHandle(new MockHttpServletRequest(method, "/api/activities/5"), response, new Object()),
                    method + " must not be blocked");
            assertEquals(200, response.getStatus());
        }
        for (String method : new String[] { "PUT", "DELETE" }) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            assertFalse(guard.preHandle(new MockHttpServletRequest(method, "/api/activities/5"), response, new Object()));
            assertEquals(403, response.getStatus());
        }
    }

    @Test
    void whenExplicitlyEnabledTheEndpointsWork() throws Exception {
        when(activityService.findById(5L)).thenReturn(Optional.of(new Activity()));

        mockMvc(true).perform(delete("/api/activities/5")).andExpect(status().isNoContent());

        verify(activityService).deleteById(5L);
        verify(userRepository, never()).findById(any());
    }
}
