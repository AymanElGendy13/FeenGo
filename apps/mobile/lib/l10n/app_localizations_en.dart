// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'FeenGo';

  @override
  String get homePlaceholderWelcome =>
      'Welcome. Places to eat, go out and celebrate are coming soon.';

  @override
  String get settingsLanguageTitle => 'Language';

  @override
  String get settingsLanguageOptionEn => 'English';

  @override
  String get settingsLanguageOptionAr => 'العربية';
}
