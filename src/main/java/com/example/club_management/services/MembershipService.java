package com.example.club_management.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import com.example.club_management.models.Club;
import com.example.club_management.models.Membership;
import com.example.club_management.models.User;
import com.example.club_management.repositories.MembershipRepository;

@Service
public class MembershipService {
    @Autowired
    private MembershipRepository membershipRepository;

    private static final String ALREADY_MEMBER = "User is already a member of this club.";

    public Membership joinClub(User user, Club club) {
        if (membershipRepository.existsByUserAndClub(user, club)) {
            throw new IllegalArgumentException(ALREADY_MEMBER);
        }
        Membership membership = new Membership();
        membership.setUser(user);
        membership.setClub(club);
        try {
            return membershipRepository.save(membership);
        } catch (DataIntegrityViolationException duplicate) {
            // A concurrent join won the race: the unique (user, club) constraint rejected this one.
            throw new IllegalArgumentException(ALREADY_MEMBER);
        }
    }
    
    /**
     * Removes the membership of the given user in the given club. If older data holds duplicate
     * rows for the same pair, all of them are removed so the user really has left.
     *
     * @return true if a membership existed and was removed, false if the user was not a member
     */
    public boolean leaveClub(User user, Club club) {
        List<Membership> memberships = membershipRepository.findAllByUserAndClub(user, club);
        if (memberships.isEmpty()) {
            return false;
        }
        membershipRepository.deleteAll(memberships);
        return true;
    }

    public List<Membership> findByUser(User user) {
        // Correctly calls the repository method with the user and pageable objects.
        return membershipRepository.findByUser(user);
    }
    
}