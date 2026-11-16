<?php

return [
    // Main folder for the backups (daily/ and monthly/ sub-folders are created inside).
    'path' => env('BACKUP_PATH', storage_path('app/backups')),

    // Second copy, ideally on another disk (D:, USB drive, network share). Empty to disable.
    'secondary_path' => env('BACKUP_SECONDARY_PATH'),

    'mysqldump' => env('MYSQLDUMP_PATH', 'C:\\xampp\\mysql\\bin\\mysqldump.exe'),

    // Daily backups are kept this many days; one backup per month is kept this many months.
    'keep_daily_days' => (int) env('BACKUP_KEEP_DAILY_DAYS', 14),
    'keep_monthly' => (int) env('BACKUP_KEEP_MONTHLY', 12),

    // Time of the nightly backup (24h format), in the local time zone below (the app itself runs in UTC).
    'time' => env('BACKUP_TIME', '02:00'),
    'timezone' => env('BACKUP_TIMEZONE', 'Africa/Algiers'),
];
