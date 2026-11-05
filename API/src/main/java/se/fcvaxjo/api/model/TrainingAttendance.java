package se.fcvaxjo.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

/**
 * One player's attendance row for one training (roster snapshot).
 * status is null until the coach marks Present / Absent / Excused.
 */
@Entity
@Table(
        name = "training_attendance",
        uniqueConstraints = @UniqueConstraint(columnNames = { "training_id", "player_user_id" }))
@Getter
@Setter
public class TrainingAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Column(name = "player_user_id", nullable = false)
    private Long playerUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    private AttendanceStatus status;
}
