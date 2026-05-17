import 'dart:convert';

Map<String, dynamic> parseGemmaJsonObject(String raw) {
  final trimmed = raw.trim();
  final fenced = RegExp(r'```(?:json)?\s*([\s\S]*?)```', multiLine: true)
      .firstMatch(trimmed)
      ?.group(1)
      ?.trim();
  final candidate = fenced ?? _extractObject(trimmed);
  final decoded = jsonDecode(candidate);
  if (decoded is! Map<String, dynamic>) {
    throw const FormatException('Gemma output was not a JSON object.');
  }
  return decoded;
}

String _extractObject(String value) {
  final start = value.indexOf('{');
  final end = value.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw const FormatException('Gemma output did not contain JSON.');
  }
  return value.substring(start, end + 1);
}

List<String> readStringList(dynamic value) {
  return (value as List<dynamic>? ?? const [])
      .map((item) => item.toString())
      .where((item) => item.trim().isNotEmpty)
      .toList();
}
