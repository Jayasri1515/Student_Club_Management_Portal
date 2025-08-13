package com.example.club_management.services;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.club_management.models.Activity;
import com.example.club_management.models.Club;
import com.example.club_management.repositories.ActivityRepository;

@Service
public class ActivityService {
    @Autowired
    private ActivityRepository activityRepository;
    
    public Page<Activity> findAll(Pageable pageable) {
        return activityRepository.findAll(pageable);
    }

    public Page<Activity> findByClub(Club club, Pageable pageable) {
        return activityRepository.findByClub(club, pageable);
    }

    public Optional<Activity> findById(Long id) {
        return activityRepository.findById(id);
    }

    public Activity save(Activity activity) {
        return activityRepository.save(activity);
    }

    public void deleteById(Long id) {
        activityRepository.deleteById(id);
    }
}