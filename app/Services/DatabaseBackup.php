<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * Nightly MySQL backup: dump, check, gzip, keep a monthly copy, mirror to a second
 * folder and prune old files. The outcome of the last run is kept in status.json.
 */
class DatabaseBackup
{
    private const PREFIX = 'gestion-inventaire-';

    /** mysqldump writes this line only once it has finished, so its absence means a truncated dump. */
    private const COMPLETED_MARKER = '-- Dump completed';

    public function __construct(
        private readonly string $directory,
        private readonly ?string $secondaryDirectory = null,
        private readonly int $keepDailyDays = 14,
        private readonly int $keepMonthly = 12,
    ) {}

    public static function fromConfig(): static
    {
        return new static(
            config('backup.path'),
            config('backup.secondary_path') ?: null,
            config('backup.keep_daily_days'),
            config('backup.keep_monthly'),
        );
    }

    /**
     * Runs a full backup and returns the path of the compressed file.
     *
     * @throws RuntimeException when the backup could not be made; the failure is recorded first
     */
    public function run(): string
    {
        $now = now();
        $sqlPath = $this->path('daily', self::PREFIX.$now->format('Y-m-d-His').'.sql');
        $warnings = [];

        try {
            File::ensureDirectoryExists(dirname($sqlPath));
            $this->dump($sqlPath);
            $this->assertComplete($sqlPath);
            $gzPath = $this->compress($sqlPath);

            $monthly = $this->keepMonthlyCopy($gzPath, $now);
            $this->prune($this->directory, $now);
            if ($this->secondaryDirectory) {
                try {
                    $this->mirror($gzPath, $monthly);
                    $this->prune($this->secondaryDirectory, $now);
                } catch (Throwable $e) {
                    $warnings[] = 'Copie vers '.$this->secondaryDirectory.' impossible : '.$e->getMessage();
                }
            }
        } catch (Throwable $e) {
            File::delete([$sqlPath, $sqlPath.'.gz']);
            $this->writeStatus(['ok' => false, 'at' => $now->toIso8601String(), 'error' => $e->getMessage()]);
            Log::error('Sauvegarde de la base echouee', ['error' => $e->getMessage()]);

            throw new RuntimeException($e->getMessage(), previous: $e);
        }

        foreach ($warnings as $warning) {
            Log::warning($warning);
        }
        $this->writeStatus([
            'ok' => true,
            'at' => $now->toIso8601String(),
            'file' => basename($gzPath),
            'size' => filesize($gzPath),
            'secondary' => $this->secondaryDirectory,
            'warnings' => $warnings,
        ]);

        return $gzPath;
    }

    /** Last run outcome, enriched with whether the last success is too old. */
    public function status(): array
    {
        $status = File::exists($this->statusPath()) ? (json_decode(File::get($this->statusPath()), true) ?: []) : [];
        $lastSuccess = $status['last_success'] ?? null;

        return [
            ...$status,
            'stale' => ! $lastSuccess || Carbon::parse($lastSuccess['at'])->lt(now()->subHours(48)),
            'daily_count' => count($this->files($this->directory, 'daily')),
            'monthly_count' => count($this->files($this->directory, 'monthly')),
        ];
    }

    protected function dump(string $path): void
    {
        $connection = config('database.connections.'.config('database.default'));
        $mysqldump = config('backup.mysqldump');

        if (($connection['driver'] ?? null) !== 'mysql' && ($connection['driver'] ?? null) !== 'mariadb') {
            throw new RuntimeException('La sauvegarde automatique ne fonctionne qu avec MySQL / MariaDB.');
        }
        if (! is_file($mysqldump)) {
            throw new RuntimeException('mysqldump est introuvable : '.$mysqldump);
        }

        $command = [$mysqldump, '--host='.$connection['host'], '--port='.$connection['port'], '--user='.$connection['username'],
            '--single-transaction', '--routines', '--events', '--default-character-set=utf8mb4', '--result-file='.$path];
        if (($connection['password'] ?? '') !== '') {
            $command[] = '--password='.$connection['password'];
        }
        $command[] = $connection['database'];

        // Under "php artisan serve" the worker environment loses SystemRoot as Windows expects it, and
        // mysqldump then cannot open a network socket (error 2004 / 10106). Passing it explicitly fixes that.
        $process = new Process($command, null, ['SystemRoot' => getenv('SYSTEMROOT') ?: 'C:\\Windows']);
        $process->setTimeout(600);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException('mysqldump a echoue : '.trim($process->getErrorOutput() ?: $process->getOutput()));
        }
    }

    private function assertComplete(string $path): void
    {
        if (! is_file($path) || filesize($path) === 0) {
            throw new RuntimeException('Le fichier de sauvegarde est vide.');
        }

        $handle = fopen($path, 'rb');
        fseek($handle, max(0, filesize($path) - 512));
        $tail = stream_get_contents($handle);
        fclose($handle);

        if (! str_contains($tail, self::COMPLETED_MARKER)) {
            throw new RuntimeException('La sauvegarde est incomplete (fin du fichier absente).');
        }
    }

    private function compress(string $sqlPath): string
    {
        $gzPath = $sqlPath.'.gz';
        $in = fopen($sqlPath, 'rb');
        $out = gzopen($gzPath, 'wb6');
        while (! feof($in)) {
            gzwrite($out, fread($in, 1024 * 1024));
        }
        fclose($in);
        gzclose($out);
        File::delete($sqlPath);

        return $gzPath;
    }

    /** The first backup of each month is also kept in monthly/. */
    private function keepMonthlyCopy(string $gzPath, Carbon $now): ?string
    {
        $month = self::PREFIX.$now->format('Y-m');
        $already = collect($this->files($this->directory, 'monthly'))->contains(fn (string $file) => str_starts_with(basename($file), $month));
        if ($already) {
            return null;
        }

        $target = $this->path('monthly', basename($gzPath));
        File::ensureDirectoryExists(dirname($target));
        File::copy($gzPath, $target);

        return $target;
    }

    private function mirror(string $daily, ?string $monthly): void
    {
        foreach (array_filter(['daily' => $daily, 'monthly' => $monthly]) as $folder => $file) {
            $target = rtrim($this->secondaryDirectory, '\\/').DIRECTORY_SEPARATOR.$folder.DIRECTORY_SEPARATOR.basename($file);
            File::ensureDirectoryExists(dirname($target));
            if (! File::copy($file, $target) || filesize($target) !== filesize($file)) {
                throw new RuntimeException('copie incomplete de '.basename($file));
            }
        }
    }

    private function prune(string $root, Carbon $now): void
    {
        $limit = $now->copy()->subDays($this->keepDailyDays)->format('Y-m-d');
        foreach ($this->files($root, 'daily') as $file) {
            if ($this->fileDate($file) < $limit) {
                File::delete($file);
            }
        }

        $monthly = $this->files($root, 'monthly');
        rsort($monthly);
        File::delete(array_slice($monthly, $this->keepMonthly));
    }

    /** @return list<string> */
    private function files(string $root, string $folder): array
    {
        return glob(rtrim($root, '\\/').DIRECTORY_SEPARATOR.$folder.DIRECTORY_SEPARATOR.self::PREFIX.'*.sql.gz') ?: [];
    }

    private function fileDate(string $file): string
    {
        return substr(basename($file), strlen(self::PREFIX), 10);
    }

    private function path(string $folder, string $name): string
    {
        return rtrim($this->directory, '\\/').DIRECTORY_SEPARATOR.$folder.DIRECTORY_SEPARATOR.$name;
    }

    private function statusPath(): string
    {
        return rtrim($this->directory, '\\/').DIRECTORY_SEPARATOR.'status.json';
    }

    private function writeStatus(array $run): void
    {
        $previous = File::exists($this->statusPath()) ? (json_decode(File::get($this->statusPath()), true) ?: []) : [];
        $status = ['last_run' => $run, 'last_success' => $run['ok'] ? $run : ($previous['last_success'] ?? null)];

        File::ensureDirectoryExists($this->directory);
        File::put($this->statusPath(), json_encode($status, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }
}
