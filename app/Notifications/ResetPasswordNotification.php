<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Symfony\Component\Mime\Email;

/** Password reset e-mail, in French and with the application's own look. */
class ResetPasswordNotification extends ResetPassword
{
    /** Content-ID of the small logo embedded in the mail header (see vendor/mail/html/header.blade.php). */
    public const LOGO_CID = 'logo-chu';

    public function toMail($notifiable): MailMessage
    {
        $minutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

        return (new MailMessage)
            ->subject('Réinitialisation de votre mot de passe')
            ->greeting('Bonjour '.($notifiable->name ?: '').',')
            ->line('Une demande de réinitialisation du mot de passe a été effectuée pour votre compte sur **G-Inventaire**.')
            ->action('Choisir un nouveau mot de passe', $this->resetUrl($notifiable))
            ->line("Ce lien est valable **{$minutes} minutes** et ne peut être utilisé qu'une seule fois.")
            ->line("Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail : votre mot de passe actuel reste inchangé.")
            ->salutation("Cordialement,  \nLe Bureau d'inventaire — CHU Tlemcen")
            ->withSymfonyMessage(fn (Email $message) => $message->embedFromPath(resource_path('images/mail-logo.jpg'), self::LOGO_CID, 'image/jpeg'));
    }
}
