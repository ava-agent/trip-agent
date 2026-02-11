// ============================================================================
// Error Types
// ============================================================================

use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON serialization error: {0}")]
    JsonSerialization(#[from] serde_json::Error),

    #[error("App data directory not found")]
    DataDirNotFound,

    #[error("Trip not found: {0}")]
    TripNotFound(String),

    #[error("Invalid trip data: {0}")]
    InvalidTripData(String),
}

pub type StorageResult<T> = Result<T, StorageError>;

// Convert StorageError to a string for JavaScript
impl From<StorageError> for String {
    fn from(error: StorageError) -> Self {
        error.to_string()
    }
}

// ============================================================================
// Data Models
// ============================================================================

/// Represents a geographic location with coordinates
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Coordinates {
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Destination {
    pub name: String,
    pub country: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub coordinates: Option<Coordinates>,
}

/// Date range for a trip
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DateRange {
    #[serde(with = "serde_iso8601")]
    pub start_date: chrono::DateTime<chrono::Utc>,
    #[serde(with = "serde_iso8601")]
    pub end_date: chrono::DateTime<chrono::Utc>,
    pub days: i64,
}

/// Budget range configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BudgetRange {
    pub min: f64,
    pub max: f64,
    pub currency: String,
}

/// User preferences for trip planning
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserPreferences {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub budget: Option<BudgetRange>,
    pub interests: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accommodation_type: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transportation_preference: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dietary_restrictions: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accessibility_needs: Option<Vec<String>>,
}

/// Location of an activity
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Location {
    pub name: String,
    pub address: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub coordinates: Option<Coordinates>,
}

/// Time slot for an activity
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TimeSlot {
    pub start: String,
    pub end: String,
    pub duration: i32,
}

/// Activity in the itinerary
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Activity {
    pub id: String,
    #[serde(rename = "type")]
    pub activity_type: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub location: Location,
    pub time: TimeSlot,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rating: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub booking_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Day plan in the itinerary
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DayPlan {
    pub day_number: i32,
    #[serde(with = "serde_iso8601")]
    pub date: chrono::DateTime<chrono::Utc>,
    pub activities: Vec<Activity>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_budget: Option<f64>,
}

/// Trip status
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TripStatus {
    Draft,
    Planning,
    Confirmed,
    Completed,
    Cancelled,
}

/// Main trip structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Trip {
    pub id: String,
    pub name: String,
    pub destination: Destination,
    pub duration: DateRange,
    pub preferences: UserPreferences,
    pub itinerary: Vec<DayPlan>,
    pub status: String,
    #[serde(with = "serde_iso8601")]
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[serde(with = "serde_iso8601")]
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

// Custom module for ISO 8601 date serialization
mod serde_iso8601 {
    use serde::{Deserialize, Deserializer, Serializer};
    use chrono::{DateTime, Utc};

    const FORMAT: &str = "%Y-%m-%dT%H:%M:%S%.3fZ";

    pub fn serialize<S>(date: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let s = date.format(FORMAT).to_string();
        serializer.serialize_str(&s)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        DateTime::parse_from_rfc3339(&s)
            .map(|dt| dt.with_timezone(&Utc))
            .map_err(serde::de::Error::custom)
    }
}

// ============================================================================
// Storage Manager
// ============================================================================

/// Manages file system storage for trip data
pub struct StorageManager {
    data_dir: PathBuf,
    trips_dir: PathBuf,
    conversations_dir: PathBuf,
}

impl StorageManager {
    /// Create a new storage manager with the given data directory
    pub fn new(data_dir: PathBuf) -> StorageResult<Self> {
        let trips_dir = data_dir.join("trips");
        let conversations_dir = data_dir.join("conversations");

        // Ensure directories exist
        std::fs::create_dir_all(&trips_dir)?;
        std::fs::create_dir_all(&conversations_dir)?;

        Ok(StorageManager {
            data_dir,
            trips_dir,
            conversations_dir,
        })
    }

    /// Get the storage manager from Tauri app handle
    pub fn from_app_handle(app: &tauri::AppHandle) -> StorageResult<Self> {
        let data_dir = app
            .path()
            .app_data_dir()
            .map_err(|_| StorageError::DataDirNotFound)?;

        Self::new(data_dir)
    }

    /// Save a trip to the file system
    pub fn save_trip(&self, trip: &Trip) -> StorageResult<()> {
        let trip_path = self.trips_dir.join(format!("{}.json", trip.id));
        let json = serde_json::to_string_pretty(trip)?;
        std::fs::write(trip_path, json)?;
        Ok(())
    }

    /// Load all trips from the file system
    pub fn load_trips(&self) -> StorageResult<Vec<Trip>> {
        let mut trips = Vec::new();

        let entries = std::fs::read_dir(&self.trips_dir)?;
        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                let content = std::fs::read_to_string(&path)?;
                let trip: Trip = serde_json::from_str(&content)?;
                trips.push(trip);
            }
        }

        // Sort by updated_at descending
        trips.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

        Ok(trips)
    }

    /// Load a single trip by ID
    pub fn load_trip(&self, id: &str) -> StorageResult<Trip> {
        let trip_path = self.trips_dir.join(format!("{}.json", id));

        if !trip_path.exists() {
            return Err(StorageError::TripNotFound(id.to_string()));
        }

        let content = std::fs::read_to_string(&trip_path)?;
        let trip: Trip = serde_json::from_str(&content)?;

        Ok(trip)
    }

    /// Delete a trip by ID
    pub fn delete_trip(&self, id: &str) -> StorageResult<()> {
        let trip_path = self.trips_dir.join(format!("{}.json", id));

        if !trip_path.exists() {
            return Err(StorageError::TripNotFound(id.to_string()));
        }

        std::fs::remove_file(trip_path)?;
        Ok(())
    }

    /// Save user preferences
    pub fn save_preferences(&self, prefs: &UserPreferences) -> StorageResult<()> {
        let prefs_path = self.data_dir.join("preferences.json");
        let json = serde_json::to_string_pretty(prefs)?;
        std::fs::write(prefs_path, json)?;
        Ok(())
    }

    /// Load user preferences
    pub fn load_preferences(&self) -> StorageResult<Option<UserPreferences>> {
        let prefs_path = self.data_dir.join("preferences.json");

        if !prefs_path.exists() {
            return Ok(None);
        }

        let content = std::fs::read_to_string(&prefs_path)?;
        let prefs: UserPreferences = serde_json::from_str(&content)?;

        Ok(Some(prefs))
    }

    /// Get the data directory path
    pub fn data_dir(&self) -> &PathBuf {
        &self.data_dir
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

use tauri::State;
use std::sync::Mutex;

/// Global state for the storage manager
pub struct StorageState(Mutex<StorageManager>);

/// Save a trip to local storage
#[tauri::command]
pub async fn save_trip(
    app: tauri::AppHandle,
    trip: Trip,
) -> Result<(), String> {
    let manager = StorageManager::from_app_handle(&app)?;
    manager.save_trip(&trip).map_err(String::from)?;
    Ok(())
}

/// Load all trips from local storage
#[tauri::command]
pub async fn load_trips(
    app: tauri::AppHandle,
) -> Result<Vec<Trip>, String> {
    let manager = StorageManager::from_app_handle(&app)?;
    manager.load_trips().map_err(String::from)
}

/// Load a single trip by ID
#[tauri::command]
pub async fn load_trip(
    app: tauri::AppHandle,
    id: String,
) -> Result<Trip, String> {
    let manager = StorageManager::from_app_handle(&app)?;
    manager.load_trip(&id).map_err(String::from)
}

/// Delete a trip by ID
#[tauri::command]
pub async fn delete_trip(
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let manager = StorageManager::from_app_handle(&app)?;
    manager.delete_trip(&id).map_err(String::from)?;
    Ok(())
}

/// Save user preferences
#[tauri::command]
pub async fn save_preferences(
    app: tauri::AppHandle,
    prefs: UserPreferences,
) -> Result<(), String> {
    let manager = StorageManager::from_app_handle(&app)?;
    manager.save_preferences(&prefs).map_err(String::from)?;
    Ok(())
}

/// Load user preferences
#[tauri::command]
pub async fn load_preferences(
    app: tauri::AppHandle,
) -> Result<Option<UserPreferences>, String> {
    let manager = StorageManager::from_app_handle(&app)?;
    manager.load_preferences().map_err(String::from)
}

/// Get the application data directory path (useful for debugging)
#[tauri::command]
pub async fn get_data_dir(
    app: tauri::AppHandle,
) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    Ok(data_dir.to_string_lossy().to_string())
}

/// Check if a trip exists
#[tauri::command]
pub async fn trip_exists(
    app: tauri::AppHandle,
    id: String,
) -> Result<bool, String> {
    let manager = StorageManager::from_app_handle(&app)?;
    let trip_path = manager.trips_dir.join(format!("{}.json", id));
    Ok(trip_path.exists())
}
