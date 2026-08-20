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


payment_service: PaymentService = DisabledPaymentService()
