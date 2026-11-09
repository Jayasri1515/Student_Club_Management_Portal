package com.example.club_management.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.club_management.models.Club;
import com.example.club_management.models.User;
import com.example.club_management.repositories.ClubRepository;
import com.example.club_management.repositories.UserRepository;
import com.example.club_management.services.MembershipService;

/** Pure mock-based tests (no Spring context, no database). */
@ExtendWith(MockitoExtension.class)
class MembershipControllerLeaveTest {

    @Mock
    private MembershipService membershipService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ClubRepository clubRepository;
    @InjectMocks
    private MembershipController controller;

    private MockMvc mockMvc;
    private User user;
    private Club club;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        user = new User();
        user.setId(1L);
        club = new Club();
        club.setId(2L);
    }

    @Test
    void leaveReturns204WhenMembershipRemoved() throws Exception {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(clubRepository.findById(2L)).thenReturn(Optional.of(club));
        when(membershipService.leaveClub(user, club)).thenReturn(true);

        mockMvc.perform(delete("/api/memberships/user/1/club/2"))
                .andExpect(status().isNoContent());

        verify(membershipService).leaveClub(user, club);
    }

    @Test
    void leaveReturns404WhenUserIsNotAMember() throws Exception {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(clubRepository.findById(2L)).thenReturn(Optional.of(club));
        when(membershipService.leaveClub(user, club)).thenReturn(false);

        mockMvc.perform(delete("/api/memberships/user/1/club/2"))
                .andExpect(status().isNotFound())
                .andExpect(content().string("User is not a member of this club."));
    }

    @Test
    void leaveReturns404WhenUserMissing() throws Exception {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());
        when(clubRepository.findById(2L)).thenReturn(Optional.of(club));

        mockMvc.perform(delete("/api/memberships/user/1/club/2"))
                .andExpect(status().isNotFound())
                .andExpect(content().string("User or Club not found."));

        verify(membershipService, never()).leaveClub(any(), any());
    }

    @Test
    void leaveReturns404WhenClubMissing() throws Exception {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(clubRepository.findById(2L)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/api/memberships/user/1/club/2"))
                .andExpect(status().isNotFound())
                .andExpect(content().string("User or Club not found."));

        verify(membershipService, never()).leaveClub(any(), any());
    }

    @Test
    void leaveRejectsNonNumericIds() throws Exception {
        mockMvc.perform(delete("/api/memberships/user/abc/club/2"))
                .andExpect(status().isBadRequest());
    }
}
