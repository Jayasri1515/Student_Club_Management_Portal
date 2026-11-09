package com.example.club_management.services;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

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
        when(membershipRepository.findAllByUserAndClub(user, club)).thenReturn(List.of(membership));

        assertTrue(service.leaveClub(user, club));

        verify(membershipRepository).deleteAll(List.of(membership));
    }

    @Test
    void leaveClubRemovesEveryDuplicateRowInsteadOfFailing() {
        User user = new User();
        Club club = new Club();
        List<Membership> duplicates = List.of(new Membership(), new Membership());
        when(membershipRepository.findAllByUserAndClub(user, club)).thenReturn(duplicates);

        assertTrue(service.leaveClub(user, club));

        verify(membershipRepository).deleteAll(duplicates);
    }

    @Test
    void leaveClubReturnsFalseWhenNotAMember() {
        User user = new User();
        Club club = new Club();
        when(membershipRepository.findAllByUserAndClub(user, club)).thenReturn(List.of());

        assertFalse(service.leaveClub(user, club));

        verify(membershipRepository, never()).deleteAll(org.mockito.ArgumentMatchers.<Iterable<Membership>>any());
    }
}
