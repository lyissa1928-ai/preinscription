<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Gate;
use App\Models\MaterialRequest;
use App\Models\AggregatedOrder;
use App\Models\Budget;
use App\Models\BudgetAllocation;
use App\Models\Asset;
use App\Models\MaintenanceTicket;
use App\Models\DeliverySlip;
use App\Models\Conversation;
use App\Models\InboxMessage;
use App\Policies\ConversationPolicy;
use App\Policies\InboxMessagePolicy;
use App\Policies\DeliverySlipPolicy;
use App\Policies\MaterialRequestPolicy;
use App\Policies\AggregatedOrderPolicy;
use App\Policies\BudgetPolicy;
use App\Policies\BudgetAllocationPolicy;
use App\Policies\AssetPolicy;
use App\Policies\MaintenanceTicketPolicy;

/**
 * AuthServiceProvider
 *
 * Register policies and gates for authorization
 * Integrates with Spatie/laravel-permission for role-based access
 */
class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        MaterialRequest::class => MaterialRequestPolicy::class,
        AggregatedOrder::class => AggregatedOrderPolicy::class,
        Budget::class => BudgetPolicy::class,
        BudgetAllocation::class => BudgetAllocationPolicy::class,
        Asset::class => AssetPolicy::class,
        MaintenanceTicket::class => MaintenanceTicketPolicy::class,
        DeliverySlip::class => DeliverySlipPolicy::class,
        Conversation::class => ConversationPolicy::class,
        InboxMessage::class => InboxMessagePolicy::class,
    ];

    /**
     * Register any application services
     */
    public function register(): void
    {
        //
    }

    /**
     * Boot the authentication services for the application
     */
    public function boot(): void
    {
        App::setLocale('fr');

        // Email de réinitialisation de mot de passe en français
        ResetPassword::toMailUsing(function (object $notifiable, string $token) {
            $url = url(route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], false));
            return (new MailMessage)
                ->subject('Réinitialisation de votre mot de passe - ESEBAT')
                ->greeting('Bonjour,')
                ->line('Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau.')
                ->action('Réinitialiser le mot de passe', $url)
                ->line('Ce lien expire dans 60 minutes.')
                ->line('Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.');
        });

        // Register policies
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }
    }
}
