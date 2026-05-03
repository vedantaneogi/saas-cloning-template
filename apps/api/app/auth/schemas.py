from pydantic import BaseModel, ConfigDict, EmailStr


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str
    picture: str | None = None


class GoogleUserInfo(BaseModel):
    sub: str
    email: EmailStr
    name: str
    picture: str | None = None
    email_verified: bool = False
