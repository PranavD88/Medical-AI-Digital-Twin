from fastapi import Depends, HTTPException, status
from .patient_auth import get_current_patient

def require_roles(*roles):
    def checker(user=Depends(get_current_patient)):
        if user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        return user
    return checker
