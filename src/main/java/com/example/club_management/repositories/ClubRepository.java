package com.example.club_management.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.club_management.models.Club;

@Repository
public interface ClubRepository extends JpaRepository<Club, Long> {
}