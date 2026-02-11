// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    // Register storage commands
    .invoke_handler(tauri::generate_handler![
      commands::save_trip,
      commands::load_trips,
      commands::load_trip,
      commands::delete_trip,
      commands::save_preferences,
      commands::load_preferences,
      commands::get_data_dir,
      commands::trip_exists,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
