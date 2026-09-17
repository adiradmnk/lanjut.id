package services

import (
	"errors"
	"fmt"

	"lanjut/backend/internal/models"
)

var (
	// ErrDiscountExceedsLimit means the candidate's discount_pct is above tenants.max_discount_pct.
	ErrDiscountExceedsLimit = errors.New("DISCOUNT_EXCEEDS_TENANT_LIMIT")
	// ErrMarginBelowFloor means the candidate's price_idr is below tenants.min_margin_floor_idr.
	ErrMarginBelowFloor = errors.New("MARGIN_BELOW_TENANT_FLOOR")
)

// ValidateOfferConstraint enforces the tenant's discount and margin guardrails server-side.
// Every ai_offers candidate — whether it came from the AI sidecar or the local deterministic
// fallback — must pass this before it is ever persisted as AI_SUGGESTED; a candidate that
// fails is rejected before it reaches the merchant approval queue at all.
//
// Assumption: the schema has no variable-cost column yet, so margin is approximated as
// margin = price_idr (the post-discount price), compared directly against
// tenants.min_margin_floor_idr. Revisit once a real cost basis exists.
func ValidateOfferConstraint(tenant *models.Tenant, discountPct, priceIDR float64) error {
	if tenant == nil {
		return errors.New("tenant constraint missing")
	}
	if discountPct > tenant.Config.MaxDiscountPct {
		return fmt.Errorf("%w: %.2f%% exceeds tenant max %.2f%%", ErrDiscountExceedsLimit, discountPct, tenant.Config.MaxDiscountPct)
	}
	margin := priceIDR
	if margin < tenant.Config.MinMarginFloorIDR {
		return fmt.Errorf("%w: %.0f is below tenant floor %.0f", ErrMarginBelowFloor, margin, tenant.Config.MinMarginFloorIDR)
	}
	return nil
}
