class GemmaModelStatus {
  const GemmaModelStatus({
    required this.available,
    required this.loaded,
    required this.modelPath,
    required this.runtime,
    required this.modelName,
    this.error,
    this.lastLatencyMs,
  });

  factory GemmaModelStatus.fromJson(Map<dynamic, dynamic> json) {
    return GemmaModelStatus(
      available: json['available'] as bool? ?? false,
      loaded: json['loaded'] as bool? ?? false,
      modelPath: json['modelPath'] as String? ?? '',
      runtime: json['runtime'] as String? ?? 'unknown',
      modelName: json['modelName'] as String? ?? 'Gemma on-device',
      error: json['error'] as String?,
      lastLatencyMs: json['lastLatencyMs'] as int?,
    );
  }

  final bool available;
  final bool loaded;
  final String modelPath;
  final String runtime;
  final String modelName;
  final String? error;
  final int? lastLatencyMs;
}
