/// Verity Scoring Engine — Rust Implementation
///
/// Mirrors the TypeScript engine in client/src/lib/scoring.ts exactly.
/// Both implementations MUST produce identical results for the same input.
///
/// Per-area daily score formula (EMA):
///   score(area, t) = α × completion(area, t) × 100 + (1 − α) × score(area, t-1)
///
/// Composite formula:
///   composite = (4×Health + 5×Mind + 3×Social + 4×Play) / 16
///
/// INTENTIONAL DIVERGENCE from the Health Longevity Score
/// (server/routes/health.ts): The Longevity Score measures physiological
/// biomarkers (HRV, HR, sleep, steps). This area score measures daily
/// behavioral habit-completion momentum. They are complementary, not redundant.
use crate::types::{HabitEntryInput, HabitInput, ScoringRequest, ScoringResponse, AreaScorePoint, CompositePoint, ProjectionPoint};
use std::collections::{BTreeMap, HashMap};

/// EMA smoothing factor. Tune this to change how much today's check-in matters.
/// α = 0.2 → ~10-day effective memory window.
pub const SCORING_ALPHA: f64 = 0.2;

/// Composite weights. Must sum to 16.
pub fn composite_weights() -> HashMap<&'static str, f64> {
    let mut m = HashMap::new();
    m.insert("health", 4.0_f64);
    m.insert("mind",   5.0_f64);
    m.insert("social", 3.0_f64);
    m.insert("play",   4.0_f64);
    m
}

/// Map DB/user-visible area names to canonical Verity life-area keys.
pub fn canonical_area(raw: &str) -> Option<&'static str> {
    match raw.trim().to_lowercase().as_str() {
        "play" | "career" => Some("play"),
        "health"          => Some("health"),
        "mind"            => Some("mind"),
        "social"          => Some("social"),
        _ => None,
    }
}

const LIFE_AREAS: [&str; 4] = ["play", "health", "mind", "social"];

/// Run the full scoring pipeline from raw habit + entry data.
pub fn run_scoring(request: &ScoringRequest) -> ScoringResponse {
    // Group habit IDs by canonical area
    let mut habits_by_area: HashMap<&str, Vec<&str>> = HashMap::new();
    for area in &LIFE_AREAS {
        habits_by_area.insert(area, Vec::new());
    }
    for h in &request.habits {
        if let Some(canonical) = canonical_area(&h.area) {
            habits_by_area.entry(canonical).or_default().push(&h.id);
        }
    }

    // Collect all unique dates from entries
    let mut date_set: std::collections::BTreeSet<&str> = Default::default();
    for e in &request.habit_entries {
        date_set.insert(&e.date);
    }
    let all_dates: Vec<&str> = date_set.into_iter().collect();

    // Build daily completion ratio per area per date
    let mut daily_completions: HashMap<&str, Vec<(String, f64)>> = HashMap::new();
    for &area in &LIFE_AREAS {
        let mut series = Vec::new();
        let area_habits = habits_by_area.get(area).cloned().unwrap_or_default();
        let total = area_habits.len();
        if total == 0 {
            daily_completions.insert(area, series);
            continue;
        }
        for &date in &all_dates {
            let ticked = request.habit_entries.iter().filter(|e| {
                e.date == date && area_habits.contains(&&*e.habit_id) && e.completed
            }).count();
            series.push((date.to_string(), ticked as f64 / total as f64));
        }
        daily_completions.insert(area, series);
    }

    // Compute EMA per area
    let mut ema_by_area: HashMap<&str, BTreeMap<String, f64>> = HashMap::new();
    let weights = composite_weights();

    for &area in &LIFE_AREAS {
        let completions = daily_completions.get(area).cloned().unwrap_or_default();
        let ema_series = compute_ema(&completions, SCORING_ALPHA);
        ema_by_area.insert(area, ema_series);
    }

    // Build composite time series
    let mut composite_series: Vec<CompositePoint> = Vec::new();
    let total_weight: f64 = weights.values().sum();

    for &date in &all_dates {
        let mut scores: HashMap<&str, f64> = HashMap::new();
        for &area in &LIFE_AREAS {
            if let Some(val) = ema_by_area.get(area).and_then(|m| m.get(date)) {
                scores.insert(area, *val);
            }
        }

        let composite = compute_composite_from_scores(&scores, &weights, total_weight);
        composite_series.push(CompositePoint {
            date: date.to_string(),
            play:      round1(*scores.get("play").unwrap_or(&0.0)),
            health:    round1(*scores.get("health").unwrap_or(&0.0)),
            mind:      round1(*scores.get("mind").unwrap_or(&0.0)),
            social:    round1(*scores.get("social").unwrap_or(&0.0)),
            composite: round1(composite),
        });
    }

    // Build projection (7–14 days forward)
    let projection = build_projection(&composite_series, 14, 14);

    // Build per-area ema series for response
    let mut area_series: Vec<AreaScorePoint> = Vec::new();
    for &area in &LIFE_AREAS {
        if let Some(map) = ema_by_area.get(area) {
            for (date, score) in map {
                area_series.push(AreaScorePoint {
                    area: area.to_string(),
                    date: date.clone(),
                    score: round1(*score),
                });
            }
        }
    }

    ScoringResponse {
        area_series,
        composite_series,
        projection,
    }
}

fn compute_ema(completions: &[(String, f64)], alpha: f64) -> BTreeMap<String, f64> {
    let mut result = BTreeMap::new();
    if completions.is_empty() {
        return result;
    }
    let mut prev = completions[0].1 * 100.0;
    for (date, ratio) in completions {
        let score = alpha * (ratio * 100.0) + (1.0 - alpha) * prev;
        prev = score;
        result.insert(date.clone(), score);
    }
    result
}

fn compute_composite_from_scores(
    scores: &HashMap<&str, f64>,
    weights: &HashMap<&str, f64>,
    total_weight: f64,
) -> f64 {
    let mut weighted_sum = 0.0;
    let mut used_weight = 0.0;
    for (area, w) in weights {
        if let Some(&s) = scores.get(*area) {
            weighted_sum += s * w;
            used_weight  += w;
        }
    }
    if used_weight == 0.0 {
        return 0.0;
    }
    let scale = total_weight / used_weight;
    weighted_sum / total_weight * scale
}

fn build_projection(
    series: &[CompositePoint],
    window_days: usize,
    project_days: usize,
) -> Vec<ProjectionPoint> {
    if series.len() < 2 {
        return Vec::new();
    }
    let n = series.len();
    let start = n.saturating_sub(window_days);
    let window: Vec<f64> = series[start..].iter().map(|p| p.composite).collect();
    let m = window.len() as f64;
    let x_mean = (m - 1.0) / 2.0;
    let y_mean: f64 = window.iter().sum::<f64>() / m;
    let (mut num, mut den) = (0.0_f64, 0.0_f64);
    for (i, &y) in window.iter().enumerate() {
        let x = i as f64;
        num += (x - x_mean) * (y - y_mean);
        den += (x - x_mean).powi(2);
    }
    let slope = if den != 0.0 { num / den } else { 0.0 };
    let last_composite = series[n - 1].composite;
    let last_date = &series[n - 1].date;

    (1..=project_days)
        .map(|i| {
            let projected = (last_composite + slope * i as f64).clamp(0.0, 100.0);
            ProjectionPoint {
                date: offset_date(last_date, i as i32),
                composite: round1(projected),
            }
        })
        .collect()
}

fn offset_date(iso: &str, days: i32) -> String {
    use chrono::NaiveDate;
    if let Ok(d) = NaiveDate::parse_from_str(iso, "%Y-%m-%d") {
        let offset = chrono::Duration::days(days as i64);
        return (d + offset).format("%Y-%m-%d").to_string();
    }
    iso.to_string()
}

fn round1(v: f64) -> f64 {
    (v * 10.0).round() / 10.0
}
