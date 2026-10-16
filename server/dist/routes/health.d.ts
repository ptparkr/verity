interface LongevityInput {
    hrv: number | null;
    restingHR: number | null;
    sleepHours: number | null;
    sleepQuality: number | null;
    steps: number | null;
}
export declare function calculateLongevity(input: LongevityInput, age?: number): {
    score: number;
    biologicalAge: number;
    ageDelta: number;
    factors: Record<string, number>;
};
export declare function getTodayCheckin(ownerId: string): {
    hasCheckedIn: boolean;
    checkin: {
        id: any;
        date: any;
        hrv: any;
        sleepHours: any;
        sleepQuality: any;
        restingHR: any;
        steps: any;
        energyLevel: any;
        moodScore: any;
        notes: any;
    };
} | {
    hasCheckedIn: boolean;
    checkin: null;
};
export declare function createOrUpdateCheckin(data: {
    id?: string;
    date?: string;
    hrv: number | null;
    sleepHours: number | null;
    sleepQuality: number | null;
    restingHR: number | null;
    steps: number | null;
    energyLevel: number | null;
    moodScore: number | null;
    notes: string;
}, ownerId: string): {
    id: string;
    date: string;
    hrv: number | null;
    sleepHours: number | null;
    sleepQuality: number | null;
    restingHR: number | null;
    steps: number | null;
    energyLevel: number | null;
    moodScore: number | null;
    notes: string;
};
export declare function getHealthTrends(metric: string, days?: number, ownerId?: string): any[];
export declare function getLongevityScore(age?: number, ownerId?: string): {
    score: number;
    biologicalAge: number;
    ageDelta: number;
    factors: Record<string, number>;
};
export declare function createMarker(data: {
    ownerId: string;
    id?: string;
    date?: string;
    vo2MaxEstimate: number | null;
    gripStrengthKg: number | null;
    waistCm: number | null;
    weightKg: number | null;
    bodyFatPercent: number | null;
    restingHRAvg: number | null;
}): {
    id: string;
    date: string;
    vo2MaxEstimate: number | null;
    gripStrengthKg: number | null;
    waistCm: number | null;
    weightKg: number | null;
    bodyFatPercent: number | null;
    restingHRAvg: number | null;
};
export declare function getMarkers(ownerId: string): any[];
declare const router: import("express-serve-static-core").Router;
export default router;
