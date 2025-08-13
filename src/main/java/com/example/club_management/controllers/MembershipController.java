package com.example.club_management.controllers;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.club_management.models.Club;
import com.example.club_management.models.Membership;
import com.example.club_management.models.User;
import com.example.club_management.repositories.ClubRepository;
import com.example.club_management.repositories.UserRepository;
import com.example.club_management.services.MembershipService;

@RestController
@RequestMapping("/api/memberships")
@CrossOrigin(origins = "http://localhost:5173")
public class MembershipController {
    @Autowired
    private MembershipService membershipService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ClubRepository clubRepository;

    @PostMapping("/join")
    public ResponseEntity<?> joinClub(@RequestBody Membership membership) {
        Optional<User> userOptional = userRepository.findById(membership.getUser().getId());
        Optional<Club> clubOptional = clubRepository.findById(membership.getClub().getId());

        if (userOptional.isPresent() && clubOptional.isPresent()) {
            try {
                Membership newMembership = membershipService.joinClub(userOptional.get(), clubOptional.get());
                return ResponseEntity.ok(newMembership);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(e.getMessage());
            }
        } else {
            return ResponseEntity.badRequest().body("User or Club not found.");
        }
    }
    
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Membership>> getMembershipsByUserId(@PathVariable Long userId) {
        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isPresent()) {
            List<Membership> memberships = membershipService.findByUser(userOptional.get());
            return ResponseEntity.ok(memberships);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
}
