import type { HomeAway } from '../../api/matches';

/**
 * One activity on a start page (Startsida), in the shape the home cards need.
 * Player, parent and coach data all turn into this, so the cards stay the same everywhere.
 */
export type HomeActivity = {
  /** Unique in the list, e.g. "t12" for a training and "m12" for a match. */
  key: string;
  kind: 'training' | 'match';
  startsAt: string;
  /** End time. A match may have none (issue #219). */
  endsAt?: string | null;
  /** "Fotbollsträning" or "Match mot Östers IF". */
  title: string;
  venue?: string | null;
  /** Match only. */
  homeAway?: HomeAway;
  cancelled: boolean;
  cancelReason?: string | null;
  /** The activity's own team, on a start page that mixes several teams (coach, admin). */
  teamName?: string | null;
};

/** "Hemma" or "Borta". */
export function homeAwayText(homeAway: HomeAway): string {
  return homeAway === 'HOME' ? 'Hemma' : 'Borta';
}

/** The meta line under the time: "Värendsvallen · Hemma · P12 Alfa", skipping what is missing. */
export function placeLine(activity: HomeActivity, teamName?: string): string {
  return [
    activity.venue,
    activity.homeAway ? homeAwayText(activity.homeAway) : null,
    teamName ?? activity.teamName,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
}
