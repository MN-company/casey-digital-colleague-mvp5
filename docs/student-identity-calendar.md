# Personal student identity and separate calendars

The native blue/red apps no longer greet everybody as Marco. After email verification they load a service-owned Supabase display profile. A normal first.last email suggests the display name; ambiguous handles/initials remain unnamed until the person supplies a name. The person can correct this from their account settings. Display name and email domain never confer an institution, programme, student number or authorization role.

`casey_account_profiles` references Auth user ID, has RLS and no public/anon/authenticated grants; the server derives ownership from a verified GoTrue identity. Only display fields are writable. The university roster remains separate.

## Credentials for Pietro

1. Open app-blu.html, Account (or the account entry inside Casey).
2. Enter Pietro's actual email and the received code. No hardcoded Pietro identity or new demo password is needed. First verification creates the Auth account automatically.
3. Native app and College handoff client now share the same Auth session; the protected conversation does not require a second login. Logout/OTP/refresh invalidate pending results and clear the embedded private client.
4. Open Home → Calendar → Il mio calendario, or Account → Il mio account e calendario, or settings.html → personal account card.
5. Connect Pietro's own Google Calendar and give read-only consent. If multiple calendars exist, select the one to show. No Gmail or calendar write permission is requested for the personal connection.

The public test account is authenticated by email but not automatically in the university roster. Protected booking/student-record operations still require authoritative roster authorization. Pietro had no existing Auth or roster entry at baseline; no actual email address, student number, institution or course was guessed or provisioned for him.

## Separation

Student Office uses the existing staff connection in dc_v3_google_connections, staff auth and admin_live_calendar; its real data and booking integration remain intact. The personal calendar uses dc_v5_student_google keyed by verified Auth user and its own encrypted Google refresh credential. An unconnected student gets an empty personal agenda and their own Casey appointments, never staff events as fallback.

At baseline one personal connection selected the same Google account/calendar as Student Office. Primary aliases are resolved to the Google email when comparing IDs. Such selection now returns no office events and requires a different personal calendar; selection also checks Google's canonical returned ID. The existing credentials are preserved; no Google connection or event is deleted. A separately selected calendar under the same Google account is permitted.

OAuth callbacks remain at the existing /oauth/student-callback; allowed return surfaces now include the native apps and settings, with exact paths and known origins. State remains short-lived, bound to Auth user and checked against an HttpOnly cookie. Backend capability checks are unchanged for booking/records. Google account consent/Workspace policy or OAuth test-user approval is a separate owner-controlled step, not implied by signing into Casey.

The agenda reads real selected-calendar events. No invented timetable is substituted. The native Home calendar action now opens it; the previous inactive Pronote button has been replaced. A synthetic agenda, if wanted later, must be explicitly marked and kept distinct from both real calendars.

## Validation

Positive and negative tests cover name parsing, invalid name markup, row ownership, attempts to set registration flags, guest denial, same-office calendar blocking, independent own-calendar success, allowed OAuth return paths, shared-session reuse, logout races and both native presentation shells. Preview canaries verify real GoTrue identity, persistent profile, private/empty calendar separation and a real name-based greeting without a model call. Final production run and manual Google-consent boundaries are documented in the release report.
