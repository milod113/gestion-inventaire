<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->string('search')->trim()->value(),
            'event' => $request->string('event')->value(),
            'subject_type' => $request->string('subject_type')->value(),
            'user_id' => $request->string('user_id')->value(),
            'date_from' => $request->string('date_from')->value(),
            'date_to' => $request->string('date_to')->value(),
        ];

        $logs = ActivityLog::query()
            ->when($filters['search'], fn ($q, $s) => $q->where(fn ($q) => $q->where('label', 'like', "%{$s}%")->orWhere('user_name', 'like', "%{$s}%")))
            ->when($filters['event'], fn ($q, $v) => $q->where('event', $v))
            ->when($filters['subject_type'], fn ($q, $v) => $q->where('subject_type', $v))
            ->when($filters['user_id'], fn ($q, $v) => $q->where('user_id', $v))
            ->when($filters['date_from'], fn ($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($filters['date_to'], fn ($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->orderByDesc('id')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Admin/Journal/Index', [
            'logs' => $logs,
            'users' => User::query()->orderBy('name')->get(['id', 'name']),
            'filters' => $filters,
        ]);
    }
}
