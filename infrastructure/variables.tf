variable "project_name" {
  description = "Project/application name."
  type        = string
  default     = "crisisconnect"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "hackathon"
}

variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "ap-south-1"
}

variable "app_url" {
  description = "Primary frontend callback URL."
  type        = string
  default     = "http://localhost:3000"
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the public RDS instance in hackathon mode."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "db_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "crisisconnect"
}

variable "db_username" {
  description = "PostgreSQL admin username."
  type        = string
  default     = "crisisadmin"
}

variable "db_password" {
  description = "PostgreSQL admin password."
  type        = string
  sensitive   = true
}

variable "ses_sender_email" {
  description = "Verified SES sender email."
  type        = string
}

variable "notification_sender_id" {
  description = "Optional sender ID label for SMS where supported."
  type        = string
  default     = "CRISISAPP"
}

variable "notifylk_user_id" {
  description = "Notify.lk user ID used by the worker Lambda for SMS delivery."
  type        = string
  sensitive   = true
  default     = ""
}

variable "notifylk_api_key" {
  description = "Notify.lk API key used by the worker Lambda for SMS delivery."
  type        = string
  sensitive   = true
  default     = ""
}

variable "notifylk_sender_id" {
  description = "Approved Notify.lk sender ID. Use NotifyDEMO only for test traffic."
  type        = string
  default     = "NotifyDEMO"
}

variable "notifylk_sms_type" {
  description = "Optional Notify.lk SMS type. Set to unicode when Sinhala or Tamil content is required."
  type        = string
  default     = ""
}

variable "demo_sms_recipients" {
  description = "Optional comma-separated Sri Lankan phone numbers that should always receive outbound SMS during demos."
  type        = string
  default     = ""
}

variable "ai_provider" {
  description = "AI provider used by the AI orchestration Lambda."
  type        = string
  default     = "gemma"
}

variable "gemma_runtime" {
  description = "Gemma runtime adapter. Module A supports ollama."
  type        = string
  default     = "ollama"
}

variable "gemma_endpoint" {
  description = "Reachable Gemma endpoint for the AI Lambda. In deployed AWS, do not use localhost unless a Gemma gateway runs inside the same runtime."
  type        = string
  default     = "http://localhost:11434"
}

variable "gemma_interactive_model" {
  description = "Gemma model used for citizen, NGO, alert, and dispatch interactions."
  type        = string
  default     = "gemma4:e4b"
}

variable "gemma_analysis_model" {
  description = "Gemma model used for government command analysis."
  type        = string
  default     = "gemma4:e4b"
}

variable "gemma_finetuned_model" {
  description = "Optional fine-tuned Gemma adapter/model identifier for CrisisConnect disaster behavior."
  type        = string
  default     = "crisisconnect-gemma4-e4b-sos"
}

variable "gemma_mode" {
  description = "Gemma routing mode label for audit and deployment documentation."
  type        = string
  default     = "local_first"
}

variable "ai_allow_cloud_fallback" {
  description = "Whether the AI Lambda may use a cloud/hosted fallback runtime."
  type        = bool
  default     = false
}

variable "offline_tile_url_template" {
  description = "URL template used by emergency sync packages for offline map tile manifests. Production deployments should use an owned or approved tile server."
  type        = string
  default     = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
}

variable "offline_tile_min_zoom" {
  description = "Default minimum zoom level for emergency sync tile manifests."
  type        = number
  default     = 12
}

variable "offline_tile_max_zoom" {
  description = "Default maximum zoom level for emergency sync tile manifests."
  type        = number
  default     = 15
}

variable "gemini_api_key" {
  description = "API key for Gemini models."
  type        = string
  sensitive   = true
  default     = ""
}

variable "gemini_interactive_model" {
  description = "Gemini interactive model."
  type        = string
  default     = "gemini-2.5-flash"
}

variable "gemini_analysis_model" {
  description = "Gemini analysis model."
  type        = string
  default     = "gemini-2.5-pro"
}
