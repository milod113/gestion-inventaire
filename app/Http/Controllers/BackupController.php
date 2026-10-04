<?php

namespace App\Http\Controllers;

use Symfony\Component\Process\Process;

class BackupController extends Controller
{
    public function download()
    {
        $connection = config('database.connections.'.config('database.default'));
        $dumpPath = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';

        if (($connection['driver'] ?? null) !== 'mysql' || ! is_file($dumpPath)) return back()->with('error', 'mysqldump est introuvable ou la base MySQL est indisponible.');

        $filename = 'gestion-inventaire-'.now()->format('Y-m-d-His').'.sql';
        $path = storage_path('app/backups/'.$filename);
        if (! is_dir(dirname($path))) mkdir(dirname($path), 0755, true);
        $command = [$dumpPath, '--host='.$connection['host'], '--port='.(string) $connection['port'], '--user='.$connection['username'], '--single-transaction', '--routines', '--events', '--default-character-set=utf8mb4', '--result-file='.$path];
        if (($connection['password'] ?? '') !== '') $command[] = '--password='.$connection['password'];
        $command[] = $connection['database'];
        $process = new Process($command);
        $process->setTimeout(120);
        $process->run();

        if (! $process->isSuccessful() || ! is_file($path)) return back()->with('error', 'La sauvegarde a echoue.');

        return response()->download($path, $filename, ['Content-Type' => 'application/sql'])->deleteFileAfterSend(true);
    }
}
