resource "azapi_update_resource" "cors_import_external" {
  type      = "Microsoft.Storage/storageAccounts/blobServices@2023-05-01"
  name      = "default"
  parent_id = azurerm_storage_account.sa_import_external.id

  body = jsonencode({
    properties = {
      cors = {
        corsRules = local.airlock_api_read_write_cors_rules
      }
    }
  })
}

resource "azapi_update_resource" "cors_export_approved" {
  type      = "Microsoft.Storage/storageAccounts/blobServices@2023-05-01"
  name      = "default"
  parent_id = azurerm_storage_account.sa_export_approved.id

  body = jsonencode({
    properties = {
      cors = {
        corsRules = local.airlock_api_read_only_cors_rules
      }
    }
  })
}

resource "azapi_update_resource" "cors_import_in_progress" {
  type      = "Microsoft.Storage/storageAccounts/blobServices@2023-05-01"
  name      = "default"
  parent_id = azurerm_storage_account.sa_export_approved.id

  body = jsonencode({
    properties = {
      cors = {
        corsRules = local.airlock_api_read_only_cors_rules
      }
    }
  })
}