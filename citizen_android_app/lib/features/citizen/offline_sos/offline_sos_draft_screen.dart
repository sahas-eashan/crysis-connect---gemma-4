import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'offline_sos_models.dart';

class OfflineSosDraftScreen extends StatelessWidget {
  const OfflineSosDraftScreen({super.key, required this.item});

  final QueuedOfflineSos item;

  Future<void> _openSms() async {
    final uri = Uri(
      scheme: 'sms',
      queryParameters: {'body': item.structured.smsDraft},
    );
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Offline SOS draft')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(item.structured.urgency.toUpperCase(),
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          Text(item.structured.refinedMessage),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: _openSms,
            icon: const Icon(Icons.sms_rounded),
            label: const Text('Open SMS fallback'),
          ),
        ],
      ),
    );
  }
}
