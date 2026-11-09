package com.example.club_management.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import com.example.club_management.models.Club;
import com.example.club_management.models.Membership;
import com.example.club_management.models.User;
import com.example.club_management.repositories.MembershipRepository;

/** Pure mock-based tests (no Spring context, no database). */
@ExtendWith(MockitoExtension.class)
class MembershipServiceJoinTest {

    @Mock
    private MembershipRepository membershipRepository;
    @InjectMocks
    private MembershipService service;

    @Test
    void joinSavesANewMembership() {
        User user = new User();
        Club club = new Club();
        when(membershipRepository.existsByUserAndClub(user, club)).thenReturn(false);
        when(membershipRepository.save(any(Membership.class))).thenAnswer(inv -> inv.getArgument(0));

        Membership result = service.joinClub(user, club);

        assertSame(user, result.getUser());
        assertSame(club, result.getClub());
    }

    @Test
    void joinRejectsAnExistingMembership() {
        User user = new User();
        Club club = new Club();
        when(membershipRepository.existsByUserAndClub(user, club)).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.joinClub(user, club));

        assertEquals("User is already a member of this club.", ex.getMessage());
        verify(membershipRepository, never()).save(any());
    }

    @Test
    void joinLosingARaceIsReportedAsAlreadyAMemberNotAServerError() {
        User user = new User();
        Club club = new Club();
        when(membershipRepository.existsByUserAndClub(user, club)).thenReturn(false);
        when(membershipRepository.save(any(Membership.class))).thenThrow(new DataIntegrityViolationException("duplicate"));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.joinClub(user, club));

        assertEquals("User is already a member of this club.", ex.getMessage());
    }
}
