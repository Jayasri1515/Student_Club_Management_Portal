package com.example.club_management.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.club_management.models.Activity;
import com.example.club_management.models.Club;
import com.example.club_management.services.ActivityService;
import com.example.club_management.services.ClubService;

/** Pure mock-based tests (no Spring context, no database). */
@ExtendWith(MockitoExtension.class)
class ActivityControllerUpdateDeleteTest {

    @Mock
    private ActivityService activityService;
    @Mock
    private ClubService clubService;
    @InjectMocks
    private ActivityController controller;

    private MockMvc mockMvc;
    private Activity existing;
    private Club club;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        club = new Club();
        club.setId(7L);
        existing = new Activity();
        existing.setId(5L);
        existing.setTitle("Old title");
        existing.setDescription("Old description");
        existing.setDate(LocalDate.of(2026, 1, 1));
        existing.setClub(club);
    }

    @Test
    void updateChangesTitleDescriptionAndDateAndKeepsClub() throws Exception {
        when(activityService.findById(5L)).thenReturn(Optional.of(existing));
        when(activityService.save(any(Activity.class))).thenAnswer(inv -> inv.getArgument(0));

        // The body also tries to move the activity to another club and change its id: both must be ignored.
        String body = "{\"id\":99,\"title\":\"New title\",\"description\":\"New description\","
                + "\"date\":\"2026-02-03\",\"club\":{\"id\":8}}";

        mockMvc.perform(put("/api/activities/5").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.title").value("New title"))
                .andExpect(jsonPath("$.club.id").value(7));

        ArgumentCaptor<Activity> saved = ArgumentCaptor.forClass(Activity.class);
        verify(activityService).save(saved.capture());
        assertSame(existing, saved.getValue());
        assertEquals("New title", saved.getValue().getTitle());
        assertEquals("New description", saved.getValue().getDescription());
        assertEquals(LocalDate.of(2026, 2, 3), saved.getValue().getDate());
        assertEquals(7L, saved.getValue().getClub().getId());
        assertEquals(5L, saved.getValue().getId());
    }

    @Test
    void updateReturns404WhenActivityMissing() throws Exception {
        when(activityService.findById(5L)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/activities/5").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"x\"}"))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Activity not found."));

        verify(activityService, never()).save(any());
    }

    @Test
    void updateReturns400WhenTitleBlankOrMissing() throws Exception {
        when(activityService.findById(5L)).thenReturn(Optional.of(existing));

        mockMvc.perform(put("/api/activities/5").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Activity title is required."));
        mockMvc.perform(put("/api/activities/5").contentType(MediaType.APPLICATION_JSON)
                .content("{\"description\":\"only description\"}"))
                .andExpect(status().isBadRequest());

        verify(activityService, never()).save(any());
        assertEquals("Old title", existing.getTitle());
    }

    private String putAndExpectOk(String body) throws Exception {
        when(activityService.findById(5L)).thenReturn(Optional.of(existing));
        when(activityService.save(any(Activity.class))).thenAnswer(inv -> inv.getArgument(0));
        return mockMvc.perform(put("/api/activities/5").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private void putAndExpectBadRequest(String body, String message) throws Exception {
        when(activityService.findById(5L)).thenReturn(Optional.of(existing));
        mockMvc.perform(put("/api/activities/5").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(message));
        verify(activityService, never()).save(any());
        assertEquals("Old title", existing.getTitle());
        assertEquals("Old description", existing.getDescription());
        assertEquals(LocalDate.of(2026, 1, 1), existing.getDate());
    }

    @Test
    void omittedDescriptionAndDateAreKept() throws Exception {
        putAndExpectOk("{\"title\":\"Only a new title\"}");

        assertEquals("Only a new title", existing.getTitle());
        assertEquals("Old description", existing.getDescription());
        assertEquals(LocalDate.of(2026, 1, 1), existing.getDate());
    }

    @Test
    void explicitNullOrEmptyClearsDescriptionAndDate() throws Exception {
        putAndExpectOk("{\"title\":\"t\",\"description\":null,\"date\":null}");
        assertEquals(null, existing.getDescription());
        assertEquals(null, existing.getDate());

        existing.setDescription("Old description");
        putAndExpectOk("{\"title\":\"t\",\"description\":\"\"}");
        assertEquals("", existing.getDescription());
    }

    @Test
    void titleOf255CharactersIsAccepted() throws Exception {
        putAndExpectOk("{\"title\":\"" + "a".repeat(255) + "\"}");
        assertEquals(255, existing.getTitle().length());
    }

    @Test
    void titleOf256CharactersIsRejected() throws Exception {
        putAndExpectBadRequest("{\"title\":\"" + "a".repeat(256) + "\"}",
                "Activity title must be 255 characters or fewer.");
    }

    @Test
    void descriptionOver255CharactersIsRejected() throws Exception {
        putAndExpectBadRequest("{\"title\":\"t\",\"description\":\"" + "d".repeat(256) + "\"}",
                "Description must be 255 characters or fewer.");
    }

    @Test
    void invalidDateOrWrongTypesAreRejected() throws Exception {
        putAndExpectBadRequest("{\"title\":\"t\",\"date\":\"03/02/2026\"}", "Date must be a valid date (YYYY-MM-DD).");
        putAndExpectBadRequest("{\"title\":\"t\",\"date\":20260203}", "Date must be a valid date (YYYY-MM-DD).");
        putAndExpectBadRequest("{\"title\":\"t\",\"description\":5}", "Description must be text.");
        putAndExpectBadRequest("{\"title\":123}", "Activity title is required.");
    }

    @Test
    void nonObjectBodyIsRejected() throws Exception {
        putAndExpectBadRequest("[1,2]", "Request body must be a JSON object.");
    }

    @Test
    void deleteReturns204WhenActivityExists() throws Exception {
        when(activityService.findById(5L)).thenReturn(Optional.of(existing));

        mockMvc.perform(delete("/api/activities/5")).andExpect(status().isNoContent());

        verify(activityService).deleteById(5L);
    }

    @Test
    void deleteReturns404WhenActivityMissing() throws Exception {
        when(activityService.findById(5L)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/activities/5"))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Activity not found."));

        verify(activityService, never()).deleteById(any());
    }
}
