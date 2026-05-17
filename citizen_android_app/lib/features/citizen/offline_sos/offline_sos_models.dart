import 'package:crisisconnect_citizen/core/ai/gemma_response_parser.dart';

class StructuredOfflineSos {
  const StructuredOfflineSos({
    required this.incidentType,
    required this.peopleCount,
    required this.medicalRisk,
    required this.vulnerablePeople,
    required this.urgency,
    required this.missingInformation,
    required this.refinedMessage,
    required this.smsDraft,
    required this.english,
    required this.sinhala,
    required this.tamil,
  });

  factory StructuredOfflineSos.fromJson(Map<String, dynamic> json) {
    final translations = json['translations'] as Map<String, dynamic>? ?? const {};
    return StructuredOfflineSos(
      incidentType: json['incidentType'] as String? ?? 'unknown',
      peopleCount: json['peopleCount'] as int? ?? 0,
      medicalRisk: json['medicalRisk'] as bool? ?? false,
      vulnerablePeople: readStringList(json['vulnerablePeople']),
      urgency: json['urgency'] as String? ?? 'high',
      missingInformation: readStringList(json['missingInformation']),
      refinedMessage: json['refinedMessage'] as String? ?? '',
      smsDraft: json['smsDraft'] as String? ?? '',
      english: translations['english'] as String? ?? '',
      sinhala: translations['sinhala'] as String? ?? '',
      tamil: translations['tamil'] as String? ?? '',
    );
  }

  final String incidentType;
  final int peopleCount;
  final bool medicalRisk;
  final List<String> vulnerablePeople;
  final String urgency;
  final List<String> missingInformation;
  final String refinedMessage;
  final String smsDraft;
  final String english;
  final String sinhala;
  final String tamil;
}

class QueuedOfflineSos {
  const QueuedOfflineSos({
    required this.localId,
    required this.type,
    required this.description,
    required this.location,
    required this.createdAt,
    required this.packageChecksum,
    required this.status,
    required this.retryCount,
    required this.structured,
  });

  factory QueuedOfflineSos.fromJson(Map<String, dynamic> json) {
    return QueuedOfflineSos(
      localId: json['localId'] as String? ?? '',
      type: json['type'] as String? ?? 'unknown',
      description: json['description'] as String? ?? '',
      location: json['location'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      packageChecksum: json['packageChecksum'] as String? ?? '',
      status: json['status'] as String? ?? 'queued',
      retryCount: json['retryCount'] as int? ?? 0,
      structured: StructuredOfflineSos.fromJson(
        (json['structured'] as Map<String, dynamic>? ?? const {}),
      ),
    );
  }

  final String localId;
  final String type;
  final String description;
  final String location;
  final String createdAt;
  final String packageChecksum;
  final String status;
  final int retryCount;
  final StructuredOfflineSos structured;

  Map<String, dynamic> toJson() {
    return {
      'localId': localId,
      'type': type,
      'description': description,
      'location': location,
      'createdAt': createdAt,
      'packageChecksum': packageChecksum,
      'status': status,
      'retryCount': retryCount,
      'structured': {
        'incidentType': structured.incidentType,
        'peopleCount': structured.peopleCount,
        'medicalRisk': structured.medicalRisk,
        'vulnerablePeople': structured.vulnerablePeople,
        'urgency': structured.urgency,
        'missingInformation': structured.missingInformation,
        'refinedMessage': structured.refinedMessage,
        'smsDraft': structured.smsDraft,
        'translations': {
          'english': structured.english,
          'sinhala': structured.sinhala,
          'tamil': structured.tamil,
        },
      },
    };
  }
}
