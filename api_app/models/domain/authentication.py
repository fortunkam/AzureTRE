from collections import namedtuple
from enum import StrEnum
from typing import List

from pydantic import BaseModel, Field


RoleAssignment = namedtuple("RoleAssignment", "resource_id, role_id")

class RoleSourceOrigin(StrEnum):
    app = "App" # App Role is assigned a the the app level
    group = "Group" # App Role is assigned via an Entra ID group
    system = "System" # Role is a System Role (e.g. TREUser, TREAdmin)

class AssignedRole(BaseModel):
    name: str
    origin: RoleSourceOrigin

class User(BaseModel):
    id: str
    name: str
    email: str = Field(None)
    roles: List[AssignedRole] = Field([])
    roleAssignments: List[RoleAssignment] = Field([])

    def is_in_role(self, role: str) -> bool:
        return any(r.name == role for r in self.roles)

class AssignableUser(BaseModel):
    name: str
    email: str

class Role(BaseModel):
    id: str
    value: str
    isEnabled: bool
    email: str = Field(None)
    allowedMemberTypes: List[str] = Field([])
    description: str
    displayName: str
    origin: str
    roleAssignments: List[RoleAssignment] = Field([])
