package com.example.club_management.services;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.club_management.models.Club;
import com.example.club_management.repositories.ClubRepository;

@Service
public class ClubService {
    @Autowired
    private ClubRepository clubRepository;

    public Page<Club> findAll(Pageable pageable) {
        return clubRepository.findAll(pageable);
    }

    public Optional<Club> findById(Long id) {
        return clubRepository.findById(id);
    }

    public Club save(Club club) {
        return clubRepository.save(club);
    }

    public void deleteById(Long id) {
        clubRepository.deleteById(id);
    }
}
