from pydantic import BaseModel


def get_sample_airlock_request_container_url(container_url: str) -> dict:
    return {
        "containerUrl": container_url
    }


def get_sample_airlock_request_account(account: str) -> dict:
    return {
        "account": account
    }


class AirlockRequestTokenInResponse(BaseModel):
    containerUrl: str

    class Config:
        schema_extra = {
            "example": {
                "container_url": get_sample_airlock_request_container_url("container_url")
            }
        }


class AirlockRequestAccountResponse(BaseModel):
    account: str

    class Config:
        schema_extra = {
            "example": {
                "account": get_sample_airlock_request_account("account")
            }
        }
