package com.example.club_management.controllers;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
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
    
    /**
     * Leave a club (delete the membership of a user in a club).
     * 204 on success; 404 if the user or club does not exist, or the user is not a member.
     * NOTE: the backend has no authentication, so it cannot verify that the caller is {@code userId}.
     */
    @DeleteMapping("/user/{userId}/club/{clubId}")
    public ResponseEntity<?> leaveClub(@PathVariable Long userId, @PathVariable Long clubId) {
        Optional<User> userOptional = userRepository.findById(userId);
        Optional<Club> clubOptional = clubRepository.findById(clubId);

        if (userOptional.isEmpty() || clubOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User or Club not found.");
        }
        if (membershipService.leaveClub(userOptional.get(), clubOptional.get())) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User is not a member of this club.");
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
