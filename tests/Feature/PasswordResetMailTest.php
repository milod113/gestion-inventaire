<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_link_is_sent_with_the_french_notification(): void
    {
        Notification::fake();
        $user = User::factory()->create(['name' => 'Amina Benali']);

        $this->post('/forgot-password', ['email' => $user->email])->assertSessionHasNoErrors();

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_reset_mail_is_in_french_and_contains_the_reset_link(): void
    {
        $user = User::factory()->create(['name' => 'Amina Benali']);
        $mail = (new ResetPasswordNotification('jeton-de-test'))->toMail($user);
        $html = (string) $mail->render();

        $this->assertSame('Réinitialisation de votre mot de passe', $mail->subject);
        $this->assertStringContainsString('Bonjour Amina Benali,', $html);
        $this->assertStringContainsString('Choisir un nouveau mot de passe', $html);
        $this->assertStringContainsString('60 minutes', $html);
        $this->assertStringContainsString('jeton-de-test', $html);
        $this->assertStringContainsString('cid:logo-chu', $html);
        $this->assertStringNotContainsString('Hello', $html);
        $this->assertStringNotContainsString('Regards', $html);
        $this->assertStringNotContainsString('trouble clicking', $html);
    }

    public function test_reset_mail_is_actually_deliverable_with_the_embedded_logo(): void
    {
        config(['mail.default' => 'array']);
        $user = User::factory()->create();

        $user->sendPasswordResetNotification('jeton-de-test');

        $sent = app('mailer')->getSymfonyTransport()->messages();
        $this->assertCount(1, $sent);
        $raw = $sent->first()->toString();
        $this->assertStringContainsString('Content-ID', $raw);
        $this->assertStringContainsString('image/jpeg', $raw);
    }
}
