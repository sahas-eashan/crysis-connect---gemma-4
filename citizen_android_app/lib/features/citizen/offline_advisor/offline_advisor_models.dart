import 'package:crisisconnect_citizen/core/ai/gemma_response_parser.dart';

class OfflineAdvisorResult {
  const OfflineAdvisorResult({
    required this.headline,
    required this.nextSteps,
    required this.safeZoneExplanation,
    required this.checklist,
    required this.warnings,
    required this.english,
    required this.sinhala,
    required this.tamil,
  });

  factory OfflineAdvisorResult.fromJson(Map<String, dynamic> json) {
    final translations = json['translations'] as Map<String, dynamic>? ?? const {};
    return OfflineAdvisorResult(
      headline: json['headline'] as String? ?? 'What to do next',
      nextSteps: readStringList(json['nextSteps']),
      safeZoneExplanation: json['safeZoneExplanation'] as String? ?? '',
      checklist: readStringList(json['checklist']),
      warnings: readStringList(json['warnings']),
      english: translations['english'] as String? ?? '',
      sinhala: translations['sinhala'] as String? ?? '',
      tamil: translations['tamil'] as String? ?? '',
    );
  }

  final String headline;
  final List<String> nextSteps;
  final String safeZoneExplanation;
  final List<String> checklist;
  final List<String> warnings;
  final String english;
  final String sinhala;
  final String tamil;
}
