resource "aws_lambda_function" "resolver" {
  function_name    = "${local.name_prefix}-resolver"
  filename         = data.archive_file.resolver_zip.output_path
  source_code_hash = data.archive_file.resolver_zip.output_base64sha256
  role             = aws_iam_role.lambda_execution.arn
  handler          = "dist/index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 512

  environment {
    variables = {
      DB_HOST                   = aws_db_instance.postgres.address
      DB_PORT                   = tostring(aws_db_instance.postgres.port)
      DB_NAME                   = var.db_name
      DB_USER                   = var.db_username
      DB_PASSWORD               = var.db_password
      S3_BUCKET                 = aws_s3_bucket.uploads.bucket
      SNS_TOPIC_ARN             = aws_sns_topic.alerts.arn
      SES_FROM                  = var.ses_sender_email
      WORKER_FUNCTION_NAME      = aws_lambda_function.worker.function_name
      OFFLINE_TILE_URL_TEMPLATE = var.offline_tile_url_template
      OFFLINE_TILE_MIN_ZOOM     = tostring(var.offline_tile_min_zoom)
      OFFLINE_TILE_MAX_ZOOM     = tostring(var.offline_tile_max_zoom)
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.resolver
  ]
}

resource "aws_lambda_function" "worker" {
  function_name    = "${local.name_prefix}-worker"
  filename         = data.archive_file.worker_zip.output_path
  source_code_hash = data.archive_file.worker_zip.output_base64sha256
  role             = aws_iam_role.lambda_execution.arn
  handler          = "dist/index.handler"
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = 512

  environment {
    variables = {
      DB_HOST             = aws_db_instance.postgres.address
      DB_PORT             = tostring(aws_db_instance.postgres.port)
      DB_NAME             = var.db_name
      DB_USER             = var.db_username
      DB_PASSWORD         = var.db_password
      S3_BUCKET           = aws_s3_bucket.uploads.bucket
      SNS_TOPIC_ARN       = aws_sns_topic.alerts.arn
      SES_FROM            = var.ses_sender_email
      NOTIFYLK_USER_ID    = var.notifylk_user_id
      NOTIFYLK_API_KEY    = var.notifylk_api_key
      NOTIFYLK_SENDER_ID  = var.notifylk_sender_id
      NOTIFYLK_SMS_TYPE   = var.notifylk_sms_type
      DEMO_SMS_RECIPIENTS = var.demo_sms_recipients
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.worker
  ]
}

resource "aws_lambda_function" "ai" {
  function_name    = "${local.name_prefix}-ai"
  filename         = data.archive_file.ai_zip.output_path
  source_code_hash = data.archive_file.ai_zip.output_base64sha256
  role             = aws_iam_role.lambda_execution.arn
  handler          = "dist/index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 512

  environment {
    variables = {
      DB_HOST                      = aws_db_instance.postgres.address
      DB_PORT                      = tostring(aws_db_instance.postgres.port)
      DB_NAME                      = var.db_name
      DB_USER                      = var.db_username
      DB_PASSWORD                  = var.db_password
      AI_PROVIDER                  = var.ai_provider
      GEMMA_RUNTIME                = var.gemma_runtime
      GEMMA_ENDPOINT               = var.gemma_endpoint
      GEMMA_INTERACTIVE_MODEL      = var.gemma_interactive_model
      GEMMA_ANALYSIS_MODEL         = var.gemma_analysis_model
      GEMMA_FINETUNED_MODEL        = var.gemma_finetuned_model
      GEMMA_MODE                   = var.gemma_mode
      AI_ALLOW_CLOUD_FALLBACK      = tostring(var.ai_allow_cloud_fallback)
      AI_RATE_LIMIT_WINDOW_MINUTES = "5"
      AI_RATE_LIMIT_DEFAULT        = "40"
      AI_RATE_LIMIT_CITIZEN        = "24"
      AI_RATE_LIMIT_NGO            = "32"
      AI_RATE_LIMIT_GOVERNMENT     = "80"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.ai
  ]
}

resource "aws_lambda_permission" "allow_appsync" {
  statement_id  = "AllowExecutionFromAppSync"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.resolver.function_name
  principal     = "appsync.amazonaws.com"
  source_arn    = "${aws_appsync_graphql_api.main.arn}/*"
}

resource "aws_lambda_permission" "allow_appsync_ai" {
  statement_id  = "AllowExecutionFromAppSyncAi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ai.function_name
  principal     = "appsync.amazonaws.com"
  source_arn    = "${aws_appsync_graphql_api.main.arn}/*"
}
