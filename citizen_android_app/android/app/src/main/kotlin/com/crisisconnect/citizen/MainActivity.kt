package com.crisisconnect.citizen

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.File
import kotlin.concurrent.thread

class MainActivity : FlutterActivity() {
    private val channelName = "crisisconnect/gemma_runtime"
    private var inference: Any? = null
    private var modelPath: String = "/data/local/tmp/llm/model.task"
    private var runtimeName: String = "Google AI Edge / MediaPipe LLM"
    private var lastError: String? = null
    private var lastLatencyMs: Long? = null
    private var cancelRequested = false

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "initializeModel" -> initializeModel(call, result)
                "generateText" -> generateText(call, result)
                "getModelStatus" -> result.success(status())
                "cancelGeneration" -> {
                    cancelRequested = true
                    result.success(status())
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun initializeModel(call: MethodCall, result: MethodChannel.Result) {
        val requestedPath = call.argument<String>("modelPath") ?: modelPath
        val maxTokens = call.argument<Int>("maxTokens") ?: 768
        val temperature = (call.argument<Double>("temperature") ?: 0.2).toFloat()
        val topK = call.argument<Int>("topK") ?: 40

        thread {
            try {
                val modelFile = File(requestedPath)
                if (!modelFile.exists()) {
                    throw IllegalArgumentException("Gemma model file was not found at $requestedPath")
                }

                val optionsClass = Class.forName("com.google.mediapipe.tasks.genai.llminference.LlmInference\$LlmInferenceOptions")
                val builder = optionsClass.getMethod("builder").invoke(null)
                builder.javaClass.getMethod("setModelPath", String::class.java).invoke(builder, requestedPath)
                invokeIfPresent(builder, "setMaxTokens", Int::class.javaPrimitiveType, maxTokens)
                invokeIfPresent(builder, "setTemperature", Float::class.javaPrimitiveType, temperature)
                invokeIfPresent(builder, "setTopK", Int::class.javaPrimitiveType, topK)
                val options = builder.javaClass.getMethod("build").invoke(builder)

                val inferenceClass = Class.forName("com.google.mediapipe.tasks.genai.llminference.LlmInference")
                inference = inferenceClass.getMethod("createFromOptions", android.content.Context::class.java, optionsClass)
                    .invoke(null, applicationContext, options)
                modelPath = requestedPath
                lastError = null
                cancelRequested = false
                runOnUiThread { result.success(status()) }
            } catch (error: Throwable) {
                lastError = error.cause?.message ?: error.message ?: error.toString()
                inference = null
                runOnUiThread {
                    result.error("GEMMA_INIT_FAILED", lastError, status())
                }
            }
        }
    }

    private fun generateText(call: MethodCall, result: MethodChannel.Result) {
        val prompt = call.argument<String>("prompt") ?: ""
        val currentInference = inference
        if (currentInference == null) {
            lastError = "Gemma model is not loaded."
            result.error("GEMMA_NOT_LOADED", lastError, status())
            return
        }

        thread {
            val started = System.currentTimeMillis()
            try {
                cancelRequested = false
                val generated = currentInference.javaClass
                    .getMethod("generateResponse", String::class.java)
                    .invoke(currentInference, prompt) as String
                lastLatencyMs = System.currentTimeMillis() - started
                lastError = null
                runOnUiThread {
                    result.success(
                        mapOf(
                            "text" to if (cancelRequested) "" else generated,
                            "status" to status()
                        )
                    )
                }
            } catch (error: Throwable) {
                lastLatencyMs = System.currentTimeMillis() - started
                lastError = error.cause?.message ?: error.message ?: error.toString()
                runOnUiThread {
                    result.error("GEMMA_GENERATE_FAILED", lastError, status())
                }
            }
        }
    }

    private fun invokeIfPresent(target: Any, name: String, parameterType: Class<*>?, value: Any) {
        try {
            if (parameterType == null) return
            target.javaClass.getMethod(name, parameterType).invoke(target, value)
        } catch (_: Throwable) {
            // Some runtime versions expose slightly different option names.
        }
    }

    private fun status(): Map<String, Any?> {
        return mapOf(
            "available" to true,
            "loaded" to (inference != null),
            "modelPath" to modelPath,
            "runtime" to runtimeName,
            "modelName" to "Gemma on-device",
            "error" to lastError,
            "lastLatencyMs" to lastLatencyMs
        )
    }
}
