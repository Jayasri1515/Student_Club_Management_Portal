package com.example.club_management.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.club_management.models.Club;
import com.example.club_management.models.Membership;
import com.example.club_management.models.User;
import com.example.club_management.repositories.MembershipRepository;

@Service
public class MembershipService {
    @Autowired
    private MembershipRepository membershipRepository;

    public Membership joinClub(User user, Club club) {
        if (membershipRepository.findByUserAndClub(user, club) != null) {
            throw new IllegalArgumentException("User is already a member of this club.");
        }
        Membership membership = new Membership();
        membership.setUser(user);
        membership.setClub(club);
        return membershipRepository.save(membership);
    }
    
    public List<Membership> findByUser(User user) {
        // Correctly calls the repository method with the user and pageable objects.
        return membershipRepository.findByUser(user);
    }
    
}