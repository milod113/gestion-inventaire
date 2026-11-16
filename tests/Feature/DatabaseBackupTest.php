<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\DatabaseBackup;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

class DatabaseBackupTest extends TestCase
{
    use RefreshDatabase;

    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = sys_get_temp_dir().DIRECTORY_SEPARATOR.'gi-backup-test-'.uniqid();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->root);
        parent::tearDown();
    }

    public function test_backup_is_compressed_kept_monthly_and_copied_to_the_second_folder(): void
    {
        $backup = $this->backup("-- dump\nINSERT INTO t VALUES (1);\n-- Dump completed on 2026-11-16\n");

        $file = $backup->run();

        $this->assertStringEndsWith('.sql.gz', $file);
        $this->assertStringContainsString('INSERT INTO t', gzdecode(file_get_contents($file)));
        $this->assertCount(1, glob("{$this->root}/main/daily/*.sql.gz"));
        $this->assertCount(1, glob("{$this->root}/main/monthly/*.sql.gz"));
        $this->assertCount(1, glob("{$this->root}/copy/daily/*.sql.gz"));
        $this->assertCount(1, glob("{$this->root}/copy/monthly/*.sql.gz"));
        $this->assertSame([], glob("{$this->root}/main/daily/*.sql"), 'the uncompressed dump is removed');

        $status = $backup->status();
        $this->assertTrue($status['last_success']['ok']);
        $this->assertFalse($status['stale']);
    }

    public function test_empty_or_truncated_dumps_are_failures_and_leave_no_file(): void
    {
        foreach (['', "-- dump\nINSERT INTO t VALUES (1);\n"] as $content) {
            $backup = $this->backup($content);

            try {
                $backup->run();
                $this->fail('An incomplete dump must not count as a backup.');
            } catch (RuntimeException) {
            }

            $this->assertSame([], glob("{$this->root}/main/daily/*"));
            $this->assertFalse($backup->status()['last_run']['ok']);
            $this->assertTrue($backup->status()['stale']);
        }
    }

    public function test_old_daily_backups_are_pruned_and_twelve_monthly_ones_are_kept(): void
    {
        foreach (["{$this->root}/main", "{$this->root}/copy"] as $root) {
            File::ensureDirectoryExists("$root/daily");
            File::ensureDirectoryExists("$root/monthly");
            foreach ([1, 13, 15, 40] as $days) {
                File::put("$root/daily/gestion-inventaire-".now()->subDays($days)->format('Y-m-d-His').'.sql.gz', 'x');
            }
            foreach (range(1, 14) as $months) {
                File::put("$root/monthly/gestion-inventaire-".now()->subMonthsNoOverflow($months)->format('Y-m-d-His').'.sql.gz', 'x');
            }
        }

        $this->backup("-- Dump completed\n")->run();

        foreach (["{$this->root}/main", "{$this->root}/copy"] as $root) {
            $this->assertCount(3, glob("$root/daily/*.sql.gz"), 'today + 1 day + 13 days old; 15 and 40 days are removed');
            $this->assertCount(12, glob("$root/monthly/*.sql.gz"));
        }
    }

    public function test_a_failing_second_folder_keeps_the_backup_but_reports_a_warning(): void
    {
        File::ensureDirectoryExists($this->root);
        File::put("{$this->root}/copy", 'a file where a folder is expected');

        $this->backup("-- Dump completed\n")->run();

        $status = $this->backup('')->status();
        $this->assertTrue($status['last_run']['ok']);
        $this->assertCount(1, $status['last_run']['warnings']);
        $this->assertCount(1, glob("{$this->root}/main/daily/*.sql.gz"));
    }

    public function test_imports_page_warns_when_no_backup_has_succeeded(): void
    {
        config(['backup.path' => "{$this->root}/main"]);
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->actingAs(User::factory()->create()->assignRole('Administrateur'))
            ->get(route('imports.index'))
            ->assertInertia(fn (Assert $page) => $page->where('backup.stale', true)->where('backup.daily_count', 0));
    }

    private function backup(string $dump): DatabaseBackup
    {
        return new class("{$this->root}/main", "{$this->root}/copy", $dump) extends DatabaseBackup
        {
            public function __construct(string $directory, string $secondary, private string $fakeDump)
            {
                parent::__construct($directory, $secondary, 14, 12);
            }

            protected function dump(string $path): void
            {
                file_put_contents($path, $this->fakeDump);
            }
        };
    }
}
