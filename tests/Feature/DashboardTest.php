<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Middleware\PermissionMiddleware;

uses(RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the tenant dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->withoutMiddleware(PermissionMiddleware::class)
        ->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('mode', 'tenant')
        ->has('tenant.kpis.ventas_hoy')
        ->has('tenant.ventas_trend')
        ->where('platform', null)
    );
});
