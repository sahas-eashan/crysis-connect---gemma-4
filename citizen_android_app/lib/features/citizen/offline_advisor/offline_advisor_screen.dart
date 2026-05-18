import 'package:crisisconnect_citizen/core/ai/gemma_prompt_builder.dart';
import 'package:crisisconnect_citizen/core/ai/gemma_response_parser.dart';
import 'package:crisisconnect_citizen/core/ai/gemma_runtime.dart';
import 'package:crisisconnect_citizen/core/ai/gemma_safety_validator.dart';
import 'package:crisisconnect_citizen/core/backend.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import 'offline_advisor_models.dart';

class OfflineAdvisorScreen extends StatefulWidget {
  const OfflineAdvisorScreen({super.key, required this.repository});

  final CitizenRepository repository;

  @override
  State<OfflineAdvisorScreen> createState() => _OfflineAdvisorScreenState();
}

class _OfflineAdvisorScreenState extends State<OfflineAdvisorScreen> {
  EmergencySyncPackage? _package;
  Position? _position;
  OfflineAdvisorResult? _result;
  String _message = 'Load a cached emergency package and Gemma model before internet fails.';
  bool _loading = false;
  bool _lowLiteracy = true;
  bool _voiceFriendly = true;
  String _language = 'english';

  @override
  void initState() {
    super.initState();
    _refreshContext();
  }

  Future<void> _refreshContext() async {
    final package = await widget.repository.loadCachedEmergencyPackage();
    final position = await widget.repository.loadCurrentPosition();
    if (!mounted) return;
    setState(() {
      _package = package;
      _position = position;
    });
  }

  Future<void> _loadModel({String? path}) async {
    setState(() => _loading = true);
    try {
      final status = await GemmaRuntime.instance.initializeModel(
        modelPath: path ?? GemmaRuntime.defaultDevModelPath,
      );
      setState(() => _message = status.loaded
          ? 'Gemma ready on-device: ${status.modelPath}'
          : 'Gemma not ready: ${status.error ?? 'unknown error'}');
    } catch (error) {
      setState(() => _message = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _importModel() async {
    setState(() => _loading = true);
    try {
      final path = await GemmaRuntime.instance.importModelFile();
      if (path != null) {
        await _loadModel(path: path);
      } else {
        setState(() => _message = 'Model import cancelled.');
      }
    } catch (error) {
      setState(
        () => _message =
            error.toString().replaceFirst('Unsupported operation: ', ''),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _generateAdvice() async {
    final package = _package;
    if (package == null) {
      setState(() => _message = 'Sync an emergency package first.');
      return;
    }

    setState(() {
      _loading = true;
      _message = 'Gemma is preparing grounded local guidance...';
    });

    try {
      final prompt = GemmaPromptBuilder.advisorPrompt(
        package: package,
        position: _position,
        language: _language,
        lowLiteracyMode: _lowLiteracy,
        voiceFriendly: _voiceFriendly,
      );
      final generated = await GemmaRuntime.instance.generateText(
        prompt: prompt,
        schemaName: 'offline_advisor',
      );
      final parsed = OfflineAdvisorResult.fromJson(
        parseGemmaJsonObject(generated.text),
      );
      final extraWarnings = GemmaSafetyValidator.advisorWarnings(
        package: package,
        outputText: generated.text,
      );
      setState(() {
        _result = OfflineAdvisorResult(
          headline: parsed.headline,
          nextSteps: parsed.nextSteps,
          safeZoneExplanation: parsed.safeZoneExplanation,
          checklist: parsed.checklist,
          warnings: [...parsed.warnings, ...extraWarnings],
          english: parsed.english,
          sinhala: parsed.sinhala,
          tamil: parsed.tamil,
        );
        _message = 'Guidance generated locally in ${generated.status.lastLatencyMs ?? 0} ms.';
      });
    } catch (error) {
      setState(() {
        _result = _fallbackAdvice(package);
        _message = 'Used deterministic offline fallback because Gemma was unavailable.';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  OfflineAdvisorResult _fallbackAdvice(EmergencySyncPackage package) {
    final snapshot = package.snapshot;
    final nearest = snapshot.safeZones.isEmpty ? null : snapshot.safeZones.first;
    final warning = snapshot.isStale ? snapshot.staleWarning : 'Follow official instructions when available.';
    return OfflineAdvisorResult(
      headline: 'Stay calm and move only if safe',
      nextSteps: [
        'Keep your phone charged and stay with your family.',
        if (nearest != null) 'Move toward ${nearest.name} only if the path is safe.',
        'Call local emergency services if anyone is injured.',
      ],
      safeZoneExplanation: nearest == null
          ? 'No cached safe zone is available in this emergency package.'
          : '${nearest.name} is a cached safe zone. Check the route before moving.',
      checklist: const ['Water', 'Medication', 'ID documents', 'Torch', 'Power bank'],
      warnings: [warning],
      english: 'Use cached CrisisConnect data as guidance only.',
      sinhala: 'Use cached CrisisConnect data as guidance only.',
      tamil: 'Use cached CrisisConnect data as guidance only.',
    );
  }

  @override
  Widget build(BuildContext context) {
    final package = _package;
    final snapshot = package?.snapshot;
    final ageText = snapshot == null
        ? 'No package'
        : '${snapshot.dataFreshnessMinutes} min data freshness • ${snapshot.tileUrls.length} tiles';

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 140),
      children: [
        _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Gemma Offline Advisor',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w900,
                      )),
              const SizedBox(height: 8),
              Text(ageText),
              const SizedBox(height: 10),
              Text(_position == null
                  ? 'GPS unavailable'
                  : 'GPS ${_position!.latitude.toStringAsFixed(4)}, ${_position!.longitude.toStringAsFixed(4)}'),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: [
                  ChoiceChip(
                    label: const Text('English'),
                    selected: _language == 'english',
                    onSelected: (_) => setState(() => _language = 'english'),
                  ),
                  ChoiceChip(
                    label: const Text('සිංහල'),
                    selected: _language == 'sinhala',
                    onSelected: (_) => setState(() => _language = 'sinhala'),
                  ),
                  ChoiceChip(
                    label: const Text('தமிழ்'),
                    selected: _language == 'tamil',
                    onSelected: (_) => setState(() => _language = 'tamil'),
                  ),
                ],
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Low-literacy mode'),
                value: _lowLiteracy,
                onChanged: (value) => setState(() => _lowLiteracy = value),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Voice-friendly short instructions'),
                value: _voiceFriendly,
                onChanged: (value) => setState(() => _voiceFriendly = value),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: _loading ? null : _generateAdvice,
                      child: Text(_loading ? 'Working...' : 'What should I do now?'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _loading ? null : () => _loadModel(),
                      child: const Text('Load dev model'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _loading ? null : _importModel,
                      child: const Text('Import model'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(_message, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
        if (_result != null) ...[
          const SizedBox(height: 16),
          _ResultCard(result: _result!, language: _language),
        ],
      ],
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result, required this.language});

  final OfflineAdvisorResult result;
  final String language;

  @override
  Widget build(BuildContext context) {
    final localized = switch (language) {
      'sinhala' => result.sinhala,
      'tamil' => result.tamil,
      _ => result.english,
    };
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(result.headline,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w900,
                  )),
          const SizedBox(height: 10),
          if (localized.isNotEmpty) Text(localized),
          const SizedBox(height: 12),
          ...result.nextSteps.map((step) => Text('• $step')),
          const SizedBox(height: 12),
          Text(result.safeZoneExplanation),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: result.checklist
                .map((item) => Chip(label: Text(item)))
                .toList(),
          ),
          const SizedBox(height: 12),
          ...result.warnings.map(
            (warning) => Text(
              warning,
              style: const TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceLowest,
        borderRadius: BorderRadius.circular(30),
      ),
      child: child,
    );
  }
}
