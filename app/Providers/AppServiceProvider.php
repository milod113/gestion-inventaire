<?php

namespace App\Providers;

use App\Models\ActivityLog;
use App\Models\Rappel;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Event::listen(Login::class, fn (Login $event) => ActivityLog::record('login', user: $event->user));
        Event::listen(Logout::class, fn (Logout $event) => $event->user && ActivityLog::record('logout', user: $event->user));

        // Types courts pour les fiches rattachees aux rappels (rappelable_type).
        Relation::morphMap(array_map(fn (array $fiche) => $fiche[0], Rappel::FICHES));
    }
}
