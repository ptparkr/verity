use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Clone, Debug, Deserialize)]
pub struct SessionInput {
    #[serde(default)]
    pub focus_min: i64,
    #[serde(default)]
    pub completed: Value,
    #[serde(default)]
    pub area: String,
    #[serde(default)]
    pub quality: Option<f64>,
    #[serde(default)]
    pub created_at: String,
}

impl SessionInput {
    pub fn completed_flag(&self) -> bool {
        match &self.completed {
            Value::Bool(value) => *value,
            Value::Number(value) => value.as_i64().unwrap_or(0) != 0,
            _ => false,
        }
    }

    pub fn area_or_other(&self) -> String {
        if self.area.trim().is_empty() {
            "other".to_string()
        } else {
            self.area.clone()
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthCheckinInput {
    pub date: String,
    #[serde(default)]
    pub sleep_hours: Option<f64>,
    #[serde(default)]
    pub hrv: Option<f64>,
    #[serde(default)]
    pub energy_level: Option<f64>,
    #[serde(default)]
    pub mood_score: Option<f64>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitInput {
    pub id: String,
    pub name: String,
    pub area: String,
    #[serde(default)]
    pub target_days: Vec<u32>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitEntryInput {
    pub habit_id: String,
    pub date: String,
    #[serde(default = "default_completed")]
    pub completed: bool,
}

fn default_completed() -> bool {
    true
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WheelAxisInput {
    pub id: String,
    #[serde(default)]
    pub current_score: f64,
    #[serde(default)]
    pub target_score: f64,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsRequest {
    #[serde(default)]
    pub sessions: Vec<SessionInput>,
    #[serde(default)]
    pub checkins: Vec<HealthCheckinInput>,
    #[serde(default)]
    pub habits: Vec<HabitInput>,
    #[serde(default)]
    pub habit_entries: Vec<HabitEntryInput>,
    #[serde(default)]
    pub wheel_axes: Vec<WheelAxisInput>,
    #[serde(default)]
    pub areas: Vec<String>,
    #[serde(default = "default_weeks")]
    pub weeks: usize,
    /// Optional EMA alpha override. Defaults to 0.2 if not provided.
    #[serde(default)]
    pub scoring_alpha: Option<f64>,
}

fn default_weeks() -> usize {
    8
}

// ── Verity Scoring Types ──────────────────────────────────────────────────

/// Input to the Verity 4-area scoring pipeline.
/// Re-uses HabitInput + HabitEntryInput from the analytics request.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoringRequest {
    pub habits: Vec<HabitInput>,
    pub habit_entries: Vec<HabitEntryInput>,
    #[serde(default = "default_scoring_alpha")]
    pub alpha: f64,
}

fn default_scoring_alpha() -> f64 {
    0.2
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AreaScorePoint {
    pub area: String,
    pub date: String,
    pub score: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompositePoint {
    pub date: String,
    pub play: f64,
    pub health: f64,
    pub mind: f64,
    pub social: f64,
    pub composite: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectionPoint {
    pub date: String,
    pub composite: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoringResponse {
    pub area_series: Vec<AreaScorePoint>,
    pub composite_series: Vec<CompositePoint>,
    pub projection: Vec<ProjectionPoint>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MomentumDataPoint {
    pub date: String,
    pub score: i64,
    pub raw_minutes: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeakHourCell {
    pub day: u32,
    pub hour: u32,
    pub avg_minutes: i64,
    pub avg_quality: Option<f64>,
    pub session_count: usize,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AreaBalanceData {
    pub week_start: String,
    pub data: BTreeMap<String, i64>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CorrelationPoint {
    pub date: String,
    pub sleep_hours: f64,
    pub avg_focus_minutes: i64,
    pub avg_quality: f64,
}

#[derive(Clone, Debug, Serialize)]
pub struct RegressionLine {
    pub slope: f64,
    pub intercept: f64,
}

#[derive(Clone, Debug, Serialize)]
pub struct LongestStreak {
    pub name: String,
    pub days: i64,
}

#[derive(Clone, Debug, Serialize)]
pub struct LowestWheelAxis {
    pub id: String,
    pub label: String,
    pub score: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeeklyReportData {
    pub week_start: String,
    pub week_end: String,
    pub total_focus_minutes: i64,
    pub focus_by_area: BTreeMap<String, i64>,
    pub completed_sessions: usize,
    pub completion_rate: f64,
    pub avg_quality: Option<f64>,
    pub top_focus_area: Option<String>,
    pub habit_completion_rate: f64,
    pub habit_area_rates: BTreeMap<String, f64>,
    pub longest_current_streak: Option<LongestStreak>,
    pub sleep_avg: Option<f64>,
    pub hrv_avg: Option<f64>,
    pub energy_avg: Option<f64>,
    pub mood_avg: Option<f64>,
    pub wheel_balance_score: i64,
    pub lowest_wheel_axis: Option<LowestWheelAxis>,
    pub momentum_score: i64,
    pub recommendations: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsResponse {
    pub momentum: Vec<MomentumDataPoint>,
    pub peak_hours: Vec<Vec<PeakHourCell>>,
    pub area_balance: Vec<AreaBalanceData>,
    pub sleep_focus_data: Vec<CorrelationPoint>,
    pub sleep_focus_regression: RegressionLine,
    pub weekly_report: WeeklyReportData,
    /// Verity 4-area compounding scores.
    pub scoring: ScoringResponse,
}

