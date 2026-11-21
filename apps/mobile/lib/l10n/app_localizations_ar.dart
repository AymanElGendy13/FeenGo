// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'FeenGo';

  @override
  String get homePlaceholderWelcome =>
      'أهلًا وسهلًا. أماكن للأكل والسهر والاحتفال قريبًا.';

  @override
  String get settingsLanguageTitle => 'اللغة';

  @override
  String get settingsLanguageOptionEn => 'English';

  @override
  String get settingsLanguageOptionAr => 'العربية';
}
