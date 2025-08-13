package com.example.club_management.controllers;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.club_management.models.Club;
import com.example.club_management.services.ClubService;

@RestController
@RequestMapping("/api/clubs")
@CrossOrigin(origins = "http://localhost:5173")
public class ClubController {
    @Autowired
    private ClubService clubService;

    @GetMapping("/getclubs")
    public Page<Club> getAllClubs(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return clubService.findAll(PageRequest.of(page, size));
    }

    @PostMapping
    public Club createClub(@RequestBody Club club) {
        return clubService.save(club);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Club> updateClub(@PathVariable Long id, @RequestBody Club clubDetails) {
        Optional<Club> optionalClub = clubService.findById(id);
        if (optionalClub.isPresent()) {
            Club club = optionalClub.get();
            club.setName(clubDetails.getName());
            club.setDescription(clubDetails.getDescription());
            club.setLeader(clubDetails.getLeader());
            return ResponseEntity.ok(clubService.save(club));
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteClub(@PathVariable Long id) {
        if (clubService.findById(id).isPresent()) {
            clubService.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
