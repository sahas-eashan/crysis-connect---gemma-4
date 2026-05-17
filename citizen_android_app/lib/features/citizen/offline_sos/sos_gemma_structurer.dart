import 'package:crisisconnect_citizen/core/ai/gemma_prompt_builder.dart';
import 'package:crisisconnect_citizen/core/ai/gemma_response_parser.dart';
import 'package:crisisconnect_citizen/core/ai/gemma_runtime.dart';
import 'package:crisisconnect_citizen/core/ai/gemma_safety_validator.dart';
import 'package:crisisconnect_citizen/core/backend.dart';
import 'package:geolocator/geolocator.dart';

import 'offline_sos_models.dart';

class SosGemmaStructurer {
  const SosGemmaStructurer();

  Future<StructuredOfflineSos> structure({
    required EmergencySyncPackage? package,
    required Position? position,
    required String type,
    required String description,
  }) async {
    if (GemmaSafetyValidator.hasPromptInjectionRisk(description)) {
      return fallback(type: type, description: description);
    }

    try {
      final prompt = GemmaPromptBuilder.sosPrompt(
        package: package,
        position: position,
        type: type,
        description: description,
      );
      final generated = await GemmaRuntime.instance.generateText(
        prompt: prompt,
        schemaName: 'offline_sos',
      );
      return StructuredOfflineSos.fromJson(parseGemmaJsonObject(generated.text));
    } catch (_) {
      return fallback(type: type, description: description);
    }
  }

  StructuredOfflineSos fallback({
    required String type,
    required String description,
  }) {
    final lower = description.toLowerCase();
    final peopleMatch = RegExp(r'\b(\d{1,2})\s*(people|persons|family|kids|children)?\b')
        .firstMatch(lower);
    final medicalRisk = [
      'sick',
      'injured',
      'bleeding',
      'pregnant',
      'elderly',
      'medicine',
      'medical',
    ].any(lower.contains);
    final urgency = lower.contains('trapped') ||
            lower.contains('water') ||
            lower.contains('cannot move') ||
            medicalRisk
        ? 'high'
        : 'medium';
    final count = int.tryParse(peopleMatch?.group(1) ?? '') ?? 0;
    final refined =
        '${type.toUpperCase()} SOS: $description. GPS attached if available. Immediate responder review requested.';
    return StructuredOfflineSos(
      incidentType: type,
      peopleCount: count,
      medicalRisk: medicalRisk,
      vulnerablePeople: lower.contains('elderly') ? const ['elderly'] : const [],
      urgency: urgency,
      missingInformation: const ['exact access route', 'current safety status'],
      refinedMessage: refined,
      smsDraft: refined,
      english: refined,
      sinhala: refined,
      tamil: refined,
    );
  }
}
