"""
Pydantic schema for the /api/health response.
Keeping schemas in their own module makes it easy to extend later
without touching the router logic.
"""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
