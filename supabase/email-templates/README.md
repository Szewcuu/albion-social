# Szablony e-mail Albion Polska

Szablony są przeznaczone dla **Supabase Auth → Emails → Templates**. Do edycji
tematu i treści w projekcie hostowanym przez Supabase wymagane jest podłączenie
**Custom SMTP**.

| Ekran Supabase | Temat | Plik |
| --- | --- | --- |
| Confirm sign up | `Potwierdź zapis w Kronice | Albion Polska` | `confirm-sign-up.html` |
| Invite user | `Zaproszenie do portalu Albion Polska` | `invite-user.html` |
| Magic link or OTP | `Twój bezpieczny link do Albion Polska` | `magic-link.html` |
| Change email address | `Potwierdź nowy adres e-mail | Albion Polska` | `change-email.html` |
| Reset password | `Odzyskaj dostęp do Kroniki | Albion Polska` | `reset-password.html` |
| Reauthentication | `{{ .Token }} — kod potwierdzający Albion Polska` | `reauthentication.html` |

Nie usuwaj zmiennych Supabase używanych przez dany szablon. Wiadomość
resetująca korzysta z `{{ .SiteURL }}` i `{{ .TokenHash }}`, aby serwer portalu
mógł zweryfikować token bez zależności od przeglądarkowego kodu PKCE. Po każdej
zmianie wyślij testową wiadomość dla danego procesu i sprawdź link zarówno na
komputerze, jak i telefonie.
