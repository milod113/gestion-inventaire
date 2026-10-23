<x-mail::layout>
{{-- Header --}}
<x-slot:header>
<x-mail::header :url="config('app.url')">
{{ config('app.name') }}
</x-mail::header>
</x-slot:header>

{{-- Body --}}
{!! $slot !!}

{{-- Subcopy --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{!! $subcopy !!}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Footer --}}
<x-slot:footer>
<x-mail::footer>
Direction des moyens matériels — Service Économat — Bureau d'inventaire

© {{ date('Y') }} {{ config('app.name') }}. Cet e-mail est envoyé automatiquement, merci de ne pas y répondre.
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
