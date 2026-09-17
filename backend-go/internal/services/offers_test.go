package services

import (
	"errors"
	"testing"

	"lanjut/backend/internal/models"
)

func testTenant(maxDiscountPct, minMarginFloorIDR float64) *models.Tenant {
	return &models.Tenant{
		Config: models.TenantConfig{
			MaxDiscountPct:    maxDiscountPct,
			MinMarginFloorIDR: minMarginFloorIDR,
		},
	}
}

func TestValidateOfferConstraint_WithinLimits(t *testing.T) {
	tenant := testTenant(15, 50000)
	if err := ValidateOfferConstraint(tenant, 10, 100000); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestValidateOfferConstraint_DiscountExactlyAtMax(t *testing.T) {
	tenant := testTenant(15, 50000)
	if err := ValidateOfferConstraint(tenant, 15, 100000); err != nil {
		t.Fatalf("discount exactly at tenant max should pass, got %v", err)
	}
}

func TestValidateOfferConstraint_DiscountJustOverMax(t *testing.T) {
	tenant := testTenant(15, 50000)
	err := ValidateOfferConstraint(tenant, 15.01, 100000)
	if !errors.Is(err, ErrDiscountExceedsLimit) {
		t.Fatalf("expected ErrDiscountExceedsLimit, got %v", err)
	}
}

func TestValidateOfferConstraint_MarginExactlyAtFloor(t *testing.T) {
	tenant := testTenant(15, 50000)
	if err := ValidateOfferConstraint(tenant, 10, 50000); err != nil {
		t.Fatalf("margin exactly at tenant floor should pass, got %v", err)
	}
}

func TestValidateOfferConstraint_MarginJustBelowFloor(t *testing.T) {
	tenant := testTenant(15, 50000)
	err := ValidateOfferConstraint(tenant, 10, 49999.99)
	if !errors.Is(err, ErrMarginBelowFloor) {
		t.Fatalf("expected ErrMarginBelowFloor, got %v", err)
	}
}

func TestValidateOfferConstraint_BothViolationsReportsDiscountFirst(t *testing.T) {
	tenant := testTenant(15, 50000)
	err := ValidateOfferConstraint(tenant, 20, 1000)
	if !errors.Is(err, ErrDiscountExceedsLimit) {
		t.Fatalf("expected ErrDiscountExceedsLimit to take priority, got %v", err)
	}
}

func TestValidateOfferConstraint_NilTenant(t *testing.T) {
	if err := ValidateOfferConstraint(nil, 10, 100000); err == nil {
		t.Fatal("expected error for nil tenant constraint")
	}
}
