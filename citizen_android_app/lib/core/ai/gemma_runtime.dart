import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';

import 'gemma_model_status.dart';

class GemmaGeneration {
  const GemmaGeneration({required this.text, required this.status});

  final String text;
  final GemmaModelStatus status;
}

class GemmaRuntime {
  GemmaRuntime._();

  static final GemmaRuntime instance = GemmaRuntime._();
  static const MethodChannel _channel = MethodChannel(
    'crisisconnect/gemma_runtime',
  );
  static const defaultDevModelPath = '/data/local/tmp/llm/model.task';

  Future<GemmaModelStatus> initializeModel({
    String modelPath = defaultDevModelPath,
    int maxTokens = 768,
    double temperature = 0.2,
    int topK = 40,
  }) async {
    final result = await _channel.invokeMethod<Map<dynamic, dynamic>>(
      'initializeModel',
      {
        'modelPath': modelPath,
        'maxTokens': maxTokens,
        'temperature': temperature,
        'topK': topK,
      },
    );
    return GemmaModelStatus.fromJson(result ?? const {});
  }

  Future<GemmaGeneration> generateText({
    required String prompt,
    required String schemaName,
    int timeoutMs = 90000,
  }) async {
    final result = await _channel.invokeMethod<Map<dynamic, dynamic>>(
      'generateText',
      {
        'prompt': prompt,
        'schemaName': schemaName,
        'timeoutMs': timeoutMs,
      },
    );
    final status = GemmaModelStatus.fromJson(
      (result?['status'] as Map<dynamic, dynamic>?) ?? const {},
    );
    return GemmaGeneration(text: result?['text'] as String? ?? '', status: status);
  }

  Future<GemmaModelStatus> getModelStatus() async {
    final result = await _channel.invokeMethod<Map<dynamic, dynamic>>(
      'getModelStatus',
    );
    return GemmaModelStatus.fromJson(result ?? const {});
  }

  Future<GemmaModelStatus> cancelGeneration() async {
    final result = await _channel.invokeMethod<Map<dynamic, dynamic>>(
      'cancelGeneration',
    );
    return GemmaModelStatus.fromJson(result ?? const {});
  }

  Future<String?> importModelFile() async {
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['task'],
      allowMultiple: false,
    );
    final sourcePath = picked?.files.single.path;
    if (sourcePath == null) return null;

    final fileName = picked!.files.single.name;
    if (!fileName.toLowerCase().endsWith('.task')) {
      throw UnsupportedError(
        'This build uses MediaPipe LLM Inference and can load .task model files. '
        '.litertlm files require a LiteRT-LM runtime integration.',
      );
    }

    final directory = await getApplicationSupportDirectory();
    final modelDirectory = Directory('${directory.path}${Platform.pathSeparator}models');
    await modelDirectory.create(recursive: true);
    final target = File(
      '${modelDirectory.path}${Platform.pathSeparator}$fileName',
    );
    await File(sourcePath).copy(target.path);
    return target.path;
  }
}
