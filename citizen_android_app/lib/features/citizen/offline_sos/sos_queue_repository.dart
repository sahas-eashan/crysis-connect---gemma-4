import 'dart:convert';

import 'package:crisisconnect_citizen/core/backend.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'offline_sos_models.dart';

class SosQueueRepository {
  SosQueueRepository(this.repository);

  static const _key = 'crisisconnect.offlineSos.queue';
  final CitizenRepository repository;

  Future<List<QueuedOfflineSos>> loadQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return const [];
    final decoded = jsonDecode(raw) as List<dynamic>? ?? const [];
    return decoded
        .whereType<Map<String, dynamic>>()
        .map(QueuedOfflineSos.fromJson)
        .toList();
  }

  Future<void> enqueue(QueuedOfflineSos item) async {
    final queue = await loadQueue();
    queue.removeWhere((existing) => existing.localId == item.localId);
    queue.insert(0, item);
    await _save(queue);
  }

  Future<List<QueuedOfflineSos>> syncQueued() async {
    final queue = await loadQueue();
    final updated = <QueuedOfflineSos>[];

    for (final item in queue) {
      if (item.status == 'synced') {
        updated.add(item);
        continue;
      }

      try {
        await repository.createSos(
          type: item.type,
          description: item.structured.refinedMessage.isNotEmpty
              ? item.structured.refinedMessage
              : item.description,
          locationOverride: item.location.isEmpty ? null : item.location,
        );
        updated.add(_copy(item, status: 'synced'));
      } catch (_) {
        updated.add(
          _copy(item, status: 'queued', retryCount: item.retryCount + 1),
        );
      }
    }

    await _save(updated);
    return updated;
  }

  Future<void> _save(List<QueuedOfflineSos> queue) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode(queue.map((item) => item.toJson()).toList()),
    );
  }

  QueuedOfflineSos _copy(
    QueuedOfflineSos item, {
    String? status,
    int? retryCount,
  }) {
    return QueuedOfflineSos(
      localId: item.localId,
      type: item.type,
      description: item.description,
      location: item.location,
      createdAt: item.createdAt,
      packageChecksum: item.packageChecksum,
      status: status ?? item.status,
      retryCount: retryCount ?? item.retryCount,
      structured: item.structured,
    );
  }
}
