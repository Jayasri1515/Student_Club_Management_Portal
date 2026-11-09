package com.example.club_management.services;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.club_management.models.Club;
import com.example.club_management.models.Membership;
import com.example.club_management.models.User;
import com.example.club_management.repositories.MembershipRepository;

@ExtendWith(MockitoExtension.class)
class MembershipServiceLeaveTest {

    @Mock
    private MembershipRepository membershipRepository;
    @InjectMocks
    private MembershipService service;

    @Test
    void leaveClubDeletesExistingMembership() {
        User user = new User();
        Club club = new Club();
        Membership membership = new Membership();
        when(membershipRepository.findByUserAndClub(user, club)).thenReturn(membership);

        assertTrue(service.leaveClub(user, club));

        verify(membershipRepository).delete(membership);
    }

    @Test
    void leaveClubReturnsFalseWhenNotAMember() {
        User user = new User();
        Club club = new Club();
        when(membershipRepository.findByUserAndClub(user, club)).thenReturn(null);

        assertFalse(service.leaveClub(user, club));

        verify(membershipRepository, never()).delete(any(Membership.class));
    }
}
