// main.rs — binary entry point.
// All logic lives in lib.rs; this file just calls run().
// The #![cfg_attr] prevents a console window appearing on Windows.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    rok_companion_lib::run();
}
