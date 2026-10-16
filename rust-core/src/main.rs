mod area_balance;
mod date;
mod momentum;
mod peak_hours;
mod pipeline;
mod regression;
mod scoring;
mod sleep_correlation;
mod types;
mod weekly_report;

use std::io::{self, Read};

use pipeline::run_analytics;
use types::AnalyticsRequest;

fn main() {
    let mut buffer = String::new();
    if let Err(err) = io::stdin().read_to_string(&mut buffer) {
        eprintln!("failed to read stdin: {err}");
        std::process::exit(1);
    }

    if buffer.trim().is_empty() {
        eprintln!("missing JSON payload on stdin");
        std::process::exit(1);
    }

    let request: AnalyticsRequest = match serde_json::from_str(&buffer) {
        Ok(value) => value,
        Err(err) => {
            eprintln!("invalid analytics payload: {err}");
            std::process::exit(1);
        }
    };

    let response = run_analytics(&request);
    match serde_json::to_string(&response) {
        Ok(json) => {
            println!("{json}");
        }
        Err(err) => {
            eprintln!("failed to serialize response: {err}");
            std::process::exit(1);
        }
    }
}
