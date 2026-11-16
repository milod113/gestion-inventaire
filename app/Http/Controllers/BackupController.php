<?php

namespace App\Http\Controllers;

use App\Services\DatabaseBackup;
use RuntimeException;

class BackupController extends Controller
{
    /** Runs a backup now (kept and rotated like the nightly one) and downloads it. */
    public function download()
    {
        try {
            $path = DatabaseBackup::fromConfig()->run();
        } catch (RuntimeException $e) {
            return back()->with('error', 'La sauvegarde a echoue : '.$e->getMessage());
        }

        return response()->download($path, basename($path), ['Content-Type' => 'application/gzip']);
    }
}
