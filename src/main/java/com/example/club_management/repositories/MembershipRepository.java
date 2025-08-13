package com.example.club_management.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.club_management.models.Club;
import com.example.club_management.models.Membership;
import com.example.club_management.models.User;

@Repository
public interface MembershipRepository extends JpaRepository<Membership, Long> {
    List<Membership> findByUser(User user);
    Membership findByUserAndClub(User user, Club club);
}