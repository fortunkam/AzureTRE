output "azureml_workspace_name" {
    value = azurerm_machine_learning_workspace.ml.name
}

output "computeinstance_name" {
    value = "ci-${local.service_resource_name_suffix}"
}

output "computecluster_name" {
    value = "cl-${local.service_resource_name_suffix}"
}

output "azureml_acr_id" {
    value = module.acr.id
}

output "azureml_storage_account_id" {
    value = module.storage.storage_account_id
}