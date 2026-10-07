<?php

use App\Http\Controllers\ServiceController;
use App\Http\Controllers\FactureController;
use App\Http\Controllers\FournisseurController;
use App\Http\Controllers\ArticleController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\DataQualityController;
use App\Http\Controllers\AdvancedImportController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Models\Article;
use App\Models\Facture;
use App\Models\Fournisseur;
use App\Models\Service;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard', [
        'stats' => [
            'articles' => Article::count(),
            'services' => Service::count(),
            'fournisseurs' => Fournisseur::count(),
            'factures' => Facture::count(),
            'montant_factures' => (float) Facture::sum('montant'),
        ],
        'recentFactures' => Facture::with('service:id,name')
            ->latest('id')
            ->limit(5)
            ->get(['id', 'service_id', 'numero_facture', 'date_facture', 'montant', 'code_fournisseur']),
    ]);
})->middleware(['auth', 'verified', 'permission:dashboard.view'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/services', [ServiceController::class, 'index'])->middleware('permission:services.view')->name('services.index');
    Route::get('/services/create', [ServiceController::class, 'create'])->middleware('permission:services.create')->name('services.create');
    Route::post('/services', [ServiceController::class, 'store'])->middleware('permission:services.create')->name('services.store');
    Route::get('/services/{service}', [ServiceController::class, 'show'])->middleware('permission:services.view')->name('services.show');
    Route::get('/services/{service}/edit', [ServiceController::class, 'edit'])->middleware('permission:services.update')->name('services.edit');
    Route::put('/services/{service}', [ServiceController::class, 'update'])->middleware('permission:services.update')->name('services.update');
    Route::delete('/services/{service}', [ServiceController::class, 'destroy'])->middleware('permission:services.delete')->name('services.destroy');

    Route::get('/factures/{facture}/details/create', [ArticleController::class, 'createForFacture'])
        ->middleware(['permission:factures.view', 'permission:articles.view', 'permission:articles.create'])
        ->name('factures.details.create');
    Route::post('/factures/{facture}/details', [ArticleController::class, 'storeForFacture'])
        ->middleware(['permission:factures.view', 'permission:articles.view', 'permission:articles.create'])
        ->name('factures.details.store');

    Route::resource('factures', FactureController::class)
        ->middleware('permission:factures.view')
        ->middlewareFor(['create', 'store'], 'permission:factures.create')
        ->middlewareFor(['edit', 'update'], 'permission:factures.update')
        ->middlewareFor('destroy', 'permission:factures.delete');
    Route::resource('fournisseurs', FournisseurController::class)
        ->middleware('permission:fournisseurs.view')
        ->middlewareFor(['create', 'store'], 'permission:fournisseurs.create')
        ->middlewareFor(['edit', 'update'], 'permission:fournisseurs.update')
        ->middlewareFor('destroy', 'permission:fournisseurs.delete');
    Route::get('/articles/imprimer', [ArticleController::class, 'print'])->middleware('permission:articles.view')->name('articles.print');
    Route::get('/articles/suggestions', [ArticleController::class, 'suggestions'])->middleware('permission:articles.view')->name('articles.suggestions');
    Route::resource('articles', ArticleController::class)
        ->middleware('permission:articles.view')
        ->middlewareFor(['create', 'store'], 'permission:articles.create')
        ->middlewareFor(['edit', 'update'], 'permission:articles.update')
        ->middlewareFor('destroy', 'permission:articles.delete');
    Route::get('/aide', fn () => Inertia::render('Help/Index'))->name('help');
    Route::get('/qualite',[DataQualityController::class, 'index'])->middleware('permission:articles.view')->name('quality.index');
    Route::post('/qualite/relier-services', [DataQualityController::class, 'relinkServices'])->middleware('permission:articles.update')->name('quality.relink-services');
    Route::get('/imports', [ImportController::class, 'index'])->middleware('role:Administrateur')->name('imports.index');
    Route::get('/imports/advanced', [AdvancedImportController::class, 'index'])->middleware('role:Administrateur')->name('imports.advanced');
    Route::post('/imports/advanced/prepare', [AdvancedImportController::class, 'prepare'])->middleware('role:Administrateur')->name('imports.advanced.prepare');
    Route::match(['get', 'post'], '/backups/database', [BackupController::class, 'download'])->middleware('permission:backups.run')->name('backups.database');
    Route::post('/imports/gestion/preview', [ImportController::class, 'preview'])->middleware('role:Administrateur')->name('imports.preview');
    Route::post('/imports/facture/preview', [ImportController::class, 'previewFactures'])->middleware('role:Administrateur')->name('imports.factures.preview');
    Route::get('/imports/{batch}', [ImportController::class, 'show'])->middleware('role:Administrateur')->name('imports.show');
    Route::get('/imports/{batch}/report', [ImportController::class, 'report'])->middleware('role:Administrateur')->name('imports.report');
    Route::post('/imports/{batch}/commit', [ImportController::class, 'commit'])->middleware('role:Administrateur')->name('imports.commit');

    Route::prefix('admin')->name('admin.')->middleware('role:Administrateur')->group(function () {
        Route::resource('users', AdminUserController::class)->except('show');
        Route::get('/journal', [ActivityLogController::class, 'index'])->name('journal.index');
        Route::patch('/users/{user}/status', [AdminUserController::class, 'toggleStatus'])->name('users.status');
    });
});

require __DIR__.'/auth.php';
