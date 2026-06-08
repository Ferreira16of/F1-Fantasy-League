import { logger } from "./logger";

const OPENF1_BASE = "https://api.openf1.org/v1";

export interface OpenF1Driver {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  country_code: string;
  headshot_url: string | null;
  session_key: number;
  meeting_key: number;
}

export interface OpenF1PitStop {
  driver_number: number;
  pit_duration: number;
  lap_number: number;
  session_key: number;
  meeting_key: number;
  date: string;
}

export interface OpenF1Position {
  driver_number: number;
  position: number;
  date: string;
  session_key: number;
  meeting_key: number;
}

export interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: string;
  meeting_key: number;
  date_start: string;
  date_end: string;
}

export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
  year: number;
}

async function fetchOpenF1<T>(path: string): Promise<T> {
  const url = `${OPENF1_BASE}${path}`;
  logger.info({ url }, "Fetching OpenF1 data");
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenF1 request failed: ${res.status} ${url}`);
  }
  return res.json() as Promise<T>;
}

export async function getMeetings(year: number): Promise<OpenF1Meeting[]> {
  return fetchOpenF1<OpenF1Meeting[]>(`/meetings?year=${year}`);
}

export async function getSessionsForMeeting(meetingKey: number): Promise<OpenF1Session[]> {
  return fetchOpenF1<OpenF1Session[]>(`/sessions?meeting_key=${meetingKey}`);
}

export async function getDriversForSession(sessionKey: number): Promise<OpenF1Driver[]> {
  return fetchOpenF1<OpenF1Driver[]>(`/drivers?session_key=${sessionKey}`);
}

export async function getPitStopsForSession(sessionKey: number): Promise<OpenF1PitStop[]> {
  return fetchOpenF1<OpenF1PitStop[]>(`/pit?session_key=${sessionKey}`);
}

export async function getPositionsForSession(sessionKey: number): Promise<OpenF1Position[]> {
  return fetchOpenF1<OpenF1Position[]>(`/position?session_key=${sessionKey}`);
}

export async function getFastestLapForSession(sessionKey: number): Promise<{ driver_number: number; lap_duration: number }[]> {
  return fetchOpenF1<{ driver_number: number; lap_duration: number }[]>(`/laps?session_key=${sessionKey}&is_pit_out_lap=false`);
}
