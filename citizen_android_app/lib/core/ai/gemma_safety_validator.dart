import 'package:crisisconnect_citizen/core/backend.dart';

class GemmaSafetyValidator {
  const GemmaSafetyValidator._();

  static List<String> advisorWarnings({
    required EmergencySyncPackage package,
    required String outputText,
  }) {
    final warnings = <String>[];
    final snapshot = package.snapshot;
    final lower = outputText.toLowerCase();
    final knownSafeZoneNames = snapshot.safeZones
        .map((zone) => zone.name.toLowerCase())
        .where((name) => name.trim().isNotEmpty)
        .toList();

    if (snapshot.isStale && !lower.contains('outdated') && !lower.contains('stale')) {
      warnings.add(snapshot.staleWarning);
    }
    if (knownSafeZoneNames.isEmpty &&
        (lower.contains('shelter') || lower.contains('safe zone'))) {
      warnings.add('No cached safe zone is available. Do not rely on named shelter advice.');
    }
    return warnings;
  }

  static bool hasPromptInjectionRisk(String text) {
    final lower = text.toLowerCase();
    return [
      'ignore previous',
      'ignore all',
      'system prompt',
      'developer message',
      'jailbreak',
      'forget instructions',
      'reveal prompt',
    ].any(lower.contains);
  }
}
