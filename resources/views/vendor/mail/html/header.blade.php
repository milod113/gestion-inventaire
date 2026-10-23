@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
<img src="cid:logo-chu" class="logo" width="64" height="64" alt="Logo CHU Tlemcen">
<span class="brand">{!! $slot !!}</span>
<span class="brand-sub">Centre Hospitalo-Universitaire de Tlemcen</span>
</a>
</td>
</tr>
