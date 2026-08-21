from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PaymentIntent:
    status: str
    message: str


class PaymentService(Protocol):
    """Provider boundary for a future payment integration."""

    def create_intent(self, *, amount_paise: int, currency: str, reference: str) -> PaymentIntent: ...

    def verify(self, transaction_reference: str) -> bool: ...


class DisabledPaymentService:
    """Safe development implementation: no money or payment data is collected."""

    def create_intent(self, *, amount_paise: int, currency: str, reference: str) -> PaymentIntent:
        return PaymentIntent(status="pending", message="Payment integration coming soon")

    def verify(self, transaction_reference: str) -> bool:
        return False


def get_payment_service() -> PaymentService:
    """Return the configured payment service instance based on PAYMENT_PROVIDER setting."""
    from .config import get_settings as _get_settings
    provider = _get_settings().payment_provider
    if provider == "disabled":
        return DisabledPaymentService()
    if provider == "razorpay":
        raise NotImplementedError("Razorpay payment service is not implemented yet. "
                                  "Set PAYMENT_PROVIDER=disabled until the integration is complete.")
    # Invalid provider values are already rejected by Settings validation
    return DisabledPaymentService()


payment_service: PaymentService = get_payment_service()
