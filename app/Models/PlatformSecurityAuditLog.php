<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformSecurityAuditLog extends Model
{
    protected $fillable = [
        'actor_id',
        'actor_name',
        'actor_email',
        'tenant_id',
        'tenant_slug',
        'tenant_label',
        'action',
        'modulo',
        'subject_type',
        'subject_id',
        'subject_label',
        'summary',
        'metadata',
        'ip_address',
        'user_agent',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
