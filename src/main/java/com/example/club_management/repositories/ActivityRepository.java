package com.example.club_management.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.club_management.models.Activity;
import com.example.club_management.models.Club;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {
    Page<Activity> findByClub(Club club, Pageable pageable);
}
