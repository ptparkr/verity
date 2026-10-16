use crate::area_balance::area_balance_by_areas;
use crate::momentum::momentum_time_series;
use crate::peak_hours::peak_hours_grid;
use crate::regression::linear_regression;
use crate::scoring::run_scoring;
use crate::sleep_correlation::sleep_focus_correlation;
use crate::types::{AnalyticsRequest, AnalyticsResponse, ScoringRequest};
use crate::weekly_report::build_weekly_report;

pub fn run_analytics(request: &AnalyticsRequest) -> AnalyticsResponse {
    let momentum = momentum_time_series(&request.sessions);
    let peak_hours = peak_hours_grid(&request.sessions);
    let area_balance = area_balance_by_areas(&request.sessions, &request.areas, request.weeks);
    let sleep_focus_data = sleep_focus_correlation(&request.sessions, &request.checkins);
    let sleep_focus_regression = linear_regression(&sleep_focus_data);
    let weekly_report = build_weekly_report(
        &request.sessions,
        &request.checkins,
        &request.habits,
        &request.habit_entries,
        &request.wheel_axes,
    );

    // Verity 4-area compounding scoring engine
    let scoring_request = ScoringRequest {
        habits: request.habits.clone(),
        habit_entries: request.habit_entries.clone(),
        alpha: request.scoring_alpha.unwrap_or(0.2),
    };
    let scoring = run_scoring(&scoring_request);

    AnalyticsResponse {
        momentum,
        peak_hours,
        area_balance,
        sleep_focus_data,
        sleep_focus_regression,
        weekly_report,
        scoring,
    }
}
